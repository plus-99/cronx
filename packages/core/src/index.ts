import { randomUUID } from 'crypto';
import { Scheduler } from './scheduler.js';
import { JobExecutor } from './executor.js';
import { MetricsCollector } from './metrics.js';
import { createStorageAdapter } from './storage/index.js';
import { 
  Job, 
  JobOptions, 
  JobRun, 
  JobStats,
  StorageAdapter, 
  CronxConfig, 
  Logger,
  CronxError 
} from './types.js';

class DefaultLogger implements Logger {
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  error(message: string, meta?: any): void {
    console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  debug(message: string, meta?: any): void {
    // Only log debug in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
}

export class Cronx {
  private storage: StorageAdapter;
  private scheduler: Scheduler;
  private executor: JobExecutor;
  private metrics: MetricsCollector;
  private logger: Logger;
  private workerId: string;
  private isStarted = false;
  private jobHandlers = new Map<string, () => Promise<any>>();

  constructor(config: CronxConfig) {
    this.workerId = config.workerId || `cronx-${randomUUID()}`;
    this.logger = config.logger || new DefaultLogger();
    this.storage = typeof config.storage === 'string' 
      ? createStorageAdapter(config.storage)
      : config.storage;

    this.scheduler = new Scheduler(this.logger, config.timezone);
    this.metrics = new MetricsCollector(config.metrics, this.logger);
    this.executor = new JobExecutor(this.storage, this.workerId, this.logger, this.metrics);

    this.logger.info('Cronx instance created', { 
      workerId: this.workerId,
      timezone: config.timezone 
    });
  }

  /**
   * Schedule a new cron job
   */
  async schedule(
    schedule: string, 
    handler: () => Promise<any>, 
    options: JobOptions
  ): Promise<void> {
    if (!options.name) {
      throw new CronxError('Job name is required');
    }

    const now = new Date();
    const job: Job = {
      name: options.name,
      schedule,
      handler,
      options,
      isActive: true,
      isPaused: false,
      createdAt: now,
      updatedAt: now
    };

    // Store handler separately (not persisted)
    this.jobHandlers.set(options.name, handler);

    // Save job to storage
    await this.storage.saveJob(job);

    // Add to scheduler
    this.scheduler.addJob(job);

    // Record metrics
    this.metrics.recordJobScheduled(options.name, this.workerId);

    this.logger.info(`Job '${options.name}' scheduled`, {
      job: options.name,
      schedule,
      retries: options.retries || 0,
      backoff: options.backoff || 'fixed'
    });
  }

  /**
   * Remove a scheduled job
   */
  async unschedule(name: string): Promise<boolean> {
    const removed = this.scheduler.removeJob(name);
    this.jobHandlers.delete(name);
    
    if (removed) {
      await this.storage.deleteJob(name);
      this.logger.info(`Job '${name}' unscheduled`, { job: name });
    }

    return removed;
  }

  /**
   * Get job information
   */
  async getJob(name: string): Promise<Job | null> {
    const job = await this.storage.getJob(name);
    if (job && this.jobHandlers.has(name)) {
      job.handler = this.jobHandlers.get(name)!;
    }
    return job;
  }

  /**
   * List all jobs
   */
  async listJobs(): Promise<Job[]> {
    const jobs = await this.storage.listJobs();
    
    // Restore handlers
    return jobs.map(job => {
      if (this.jobHandlers.has(job.name)) {
        job.handler = this.jobHandlers.get(job.name)!;
      }
      return job;
    });
  }

  /**
   * Get job run history
   */
  async getJobRuns(jobName: string, limit?: number): Promise<JobRun[]> {
    return await this.storage.getJobRuns(jobName, limit);
  }

  /**
   * Get job statistics
   */
  async getJobStats(jobName?: string): Promise<JobStats> {
    return await this.storage.getJobStats(jobName);
  }

  /**
   * Pause a job (stops scheduling new executions)
   */
  async pauseJob(name: string): Promise<boolean> {
    const success = await this.storage.pauseJob(name);
    if (success) {
      // Update scheduler
      const job = this.scheduler.getJob(name);
      if (job) {
        job.isPaused = true;
        job.updatedAt = new Date();
      }
      this.logger.info(`Job '${name}' paused`, { job: name });
    }
    return success;
  }

  /**
   * Resume a paused job
   */
  async resumeJob(name: string): Promise<boolean> {
    const success = await this.storage.resumeJob(name);
    if (success) {
      // Update scheduler
      const job = this.scheduler.getJob(name);
      if (job) {
        job.isPaused = false;
        job.updatedAt = new Date();
      }
      this.logger.info(`Job '${name}' resumed`, { job: name });
    }
    return success;
  }

  /**
   * Get upcoming run times for a job
   */
  getUpcomingRuns(jobName: string, count?: number): Date[] {
    return this.scheduler.getUpcomingRuns(jobName, count);
  }

  /**
   * Manually trigger a job execution
   */
  async runJob(name: string): Promise<JobRun> {
    const job = await this.getJob(name);
    if (!job) {
      throw new CronxError(`Job '${name}' not found`);
    }

    this.logger.info(`Manually triggering job '${name}'`, { job: name });
    return await this.executor.executeJob(job);
  }

  /**
   * Start the cron scheduler
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      this.logger.warn('Cronx is already started');
      return;
    }

    try {
      // Connect to storage
      await this.storage.connect();
      
      // Load existing jobs from storage
      await this.loadJobsFromStorage();
      
      // Start scheduler
      this.scheduler.start();
      
      this.isStarted = true;
      this.logger.info('Cronx started successfully', { workerId: this.workerId });
      
    } catch (error) {
      this.logger.error(`Failed to start Cronx: ${error}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Stop the cron scheduler
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      this.logger.warn('Cronx is not started');
      return;
    }

    try {
      // Stop scheduler
      this.scheduler.stop();
      
      // Disconnect from storage
      await this.storage.disconnect();
      
      this.isStarted = false;
      this.logger.info('Cronx stopped successfully', { workerId: this.workerId });
      
    } catch (error) {
      this.logger.error(`Error stopping Cronx: ${error}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check if Cronx is running
   */
  isRunning(): boolean {
    return this.isStarted;
  }

  /**
   * Get Cronx statistics
   */
  async getStats(): Promise<{
    totalJobs: number;
    activeJobs: number;
    pausedJobs: number;
    workerId: string;
    isRunning: boolean;
  }> {
    const jobs = await this.listJobs();
    
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(job => job.isActive && !job.isPaused).length,
      pausedJobs: jobs.filter(job => job.isPaused).length,
      workerId: this.workerId,
      isRunning: this.isStarted
    };
  }

  /**
   * Get Prometheus metrics (if enabled)
   */
  async getMetrics(): Promise<string> {
    return await this.metrics.getMetrics();
  }

  private async loadJobsFromStorage(): Promise<void> {
    try {
      const storedJobs = await this.storage.listJobs();
      
      this.logger.info(`Loading ${storedJobs.length} jobs from storage`);
      
      for (const job of storedJobs) {
        // Jobs from storage won't have handlers, they need to be re-registered
        // This is expected - handlers are not persisted
        if (this.jobHandlers.has(job.name)) {
          job.handler = this.jobHandlers.get(job.name)!;
          this.scheduler.addJob(job);
        } else {
          this.logger.warn(`Job '${job.name}' found in storage but no handler registered`, {
            job: job.name
          });
        }
      }
      
    } catch (error) {
      this.logger.error(`Failed to load jobs from storage: ${error}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Export types and classes
export {
  Job,
  JobOptions,
  JobRun,
  JobStats,
  StorageAdapter,
  CronxConfig,
  Logger,
  CronxError,
  JobExecutionError,
  StorageError
} from './types.js';

export {
  MemoryStorageAdapter,
  SQLiteStorageAdapter,
  PostgresStorageAdapter,
  RedisStorageAdapter
} from './storage/index.js';

export { Scheduler } from './scheduler.js';
export { JobExecutor } from './executor.js';