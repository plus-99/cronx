import { parseExpression } from 'cron-parser';
import { Job, Logger } from './types.js';

export class Scheduler {
  private jobs = new Map<string, Job>();
  private timers = new Map<string, NodeJS.Timeout>();
  private isRunning = false;

  constructor(
    private logger?: Logger,
    private timezone?: string
  ) {}

  addJob(job: Job): void {
    this.jobs.set(job.name, job);
    this.logger?.info(`Job '${job.name}' added to scheduler`, { job: job.name, schedule: job.schedule });
    
    if (this.isRunning && job.isActive) {
      this.scheduleJob(job);
    }
  }

  removeJob(name: string): boolean {
    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(name);
    }
    
    const removed = this.jobs.delete(name);
    if (removed) {
      this.logger?.info(`Job '${name}' removed from scheduler`, { job: name });
    }
    
    return removed;
  }

  getJob(name: string): Job | undefined {
    return this.jobs.get(name);
  }

  listJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.logger?.info('Scheduler started');

    // Schedule all active jobs
    for (const job of this.jobs.values()) {
      if (job.isActive) {
        this.scheduleJob(job);
      }
    }
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.logger?.info('Scheduler stopped');

    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  private scheduleJob(job: Job): void {
    try {
      const cronExpression = parseExpression(job.schedule, {
        tz: this.timezone
      });
      
      const nextRun = cronExpression.next().toDate();
      job.nextRun = nextRun;
      
      const delay = nextRun.getTime() - Date.now();
      
      this.logger?.debug(`Scheduling job '${job.name}' to run in ${delay}ms`, {
        job: job.name,
        nextRun: nextRun.toISOString()
      });

      const timer = setTimeout(() => {
        this.executeJob(job);
        
        // Reschedule for next execution
        if (this.isRunning && job.isActive) {
          this.scheduleJob(job);
        }
      }, delay);

      this.timers.set(job.name, timer);
      
    } catch (error) {
      this.logger?.error(`Failed to schedule job '${job.name}': ${error}`, {
        job: job.name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private executeJob(job: Job): void {
    this.logger?.info(`Executing job '${job.name}'`, { job: job.name });
    
    // Update last run time
    job.lastRun = new Date();
    
    // The actual execution will be handled by the executor
    // This just triggers the job to be picked up by the execution engine
  }

  // Get next scheduled run time for a job
  getNextRunTime(jobName: string): Date | null {
    const job = this.jobs.get(jobName);
    if (!job || !job.isActive) return null;

    try {
      const cronExpression = parseExpression(job.schedule, {
        tz: this.timezone
      });
      return cronExpression.next().toDate();
    } catch (error) {
      this.logger?.error(`Failed to calculate next run time for job '${jobName}': ${error}`, {
        job: jobName,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  // Calculate multiple future run times
  getUpcomingRuns(jobName: string, count: number = 5): Date[] {
    const job = this.jobs.get(jobName);
    if (!job || !job.isActive) return [];

    try {
      const cronExpression = parseExpression(job.schedule, {
        tz: this.timezone
      });
      
      const runs: Date[] = [];
      for (let i = 0; i < count; i++) {
        runs.push(cronExpression.next().toDate());
      }
      
      return runs;
    } catch (error) {
      this.logger?.error(`Failed to calculate upcoming runs for job '${jobName}': ${error}`, {
        job: jobName,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }
}