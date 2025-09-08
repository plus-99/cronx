import { randomUUID } from 'crypto';
import { Job, JobRun, StorageAdapter, Logger, BackoffStrategy, JobExecutionError } from './types.js';

export class FixedBackoffStrategy implements BackoffStrategy {
  constructor(private delay: number = 1000) {}

  calculate(attempt: number): number {
    return this.delay;
  }
}

export class ExponentialBackoffStrategy implements BackoffStrategy {
  constructor(
    private baseDelay: number = 1000,
    private maxDelay: number = 30000,
    private factor: number = 2
  ) {}

  calculate(attempt: number): number {
    const delay = this.baseDelay * Math.pow(this.factor, attempt - 1);
    return Math.min(delay, this.maxDelay);
  }
}

export class JobExecutor {
  private runningJobs = new Set<string>();
  private lockTTL = 60000; // 1 minute lock TTL
  private lockExtendInterval = 30000; // Extend lock every 30 seconds

  constructor(
    private storage: StorageAdapter,
    private workerId: string,
    private logger?: Logger,
    private metrics?: any // MetricsCollector (avoiding circular import)
  ) {}

  async executeJob(job: Job): Promise<JobRun> {
    const runId = randomUUID();
    
    // Check if job is paused before attempting execution
    if (job.isPaused) {
      this.logger?.info(`Job '${job.name}' is paused, skipping execution`, {
        job: job.name,
        workerId: this.workerId
      });
      
      return {
        id: runId,
        jobName: job.name,
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        attempt: 1,
        result: { skipped: true, reason: 'Job is paused' }
      };
    }
    
    const isLockAcquired = await this.acquireJobLock(job.name);
    
    if (!isLockAcquired) {
      this.logger?.info(`Job '${job.name}' is already running on another worker`, {
        job: job.name,
        workerId: this.workerId
      });
      
      // Return a run indicating it was skipped
      return {
        id: runId,
        jobName: job.name,
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        attempt: 1,
        result: { skipped: true, reason: 'Already running on another worker' }
      };
    }

    const jobRun: JobRun = {
      id: runId,
      jobName: job.name,
      status: 'pending',
      attempt: 1
    };

    try {
      await this.storage.saveJobRun(jobRun);
      return await this.executeJobWithRetries(job, jobRun);
    } finally {
      await this.releaseJobLock(job.name);
    }
  }

  private async executeJobWithRetries(job: Job, initialRun: JobRun): Promise<JobRun> {
    const maxRetries = job.options.retries || 0;
    let currentRun = initialRun;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      currentRun.attempt = attempt;
      currentRun.status = 'running';
      currentRun.startTime = new Date();
      
      await this.storage.saveJobRun(currentRun);
      
      // Set up lock extension for long-running jobs
      const lockExtender = this.setupLockExtension(job.name);
      
      try {
        this.logger?.info(`Executing job '${job.name}' (attempt ${attempt}/${maxRetries + 1})`, {
          job: job.name,
          attempt,
          runId: currentRun.id
        });

        // Record job started metric
        this.metrics?.recordJobStarted(job.name, this.workerId);

        const result = await this.executeJobHandler(job);
        
        // Job completed successfully
        currentRun.status = 'completed';
        currentRun.endTime = new Date();
        currentRun.result = result;
        
        await this.storage.saveJobRun(currentRun);
        
        const duration = currentRun.endTime.getTime() - currentRun.startTime.getTime();
        
        this.logger?.info(`Job '${job.name}' completed successfully`, {
          job: job.name,
          attempt,
          runId: currentRun.id,
          duration
        });

        // Record job completion metric
        this.metrics?.recordJobCompleted(job.name, this.workerId, duration);

        // Call success callback if provided
        if (job.options.onSuccess) {
          try {
            await job.options.onSuccess(result);
          } catch (callbackError) {
            this.logger?.warn(`Success callback failed for job '${job.name}': ${callbackError}`, {
              job: job.name,
              runId: currentRun.id
            });
          }
        }

        return currentRun;
        
      } catch (error) {
        currentRun.status = 'failed';
        currentRun.endTime = new Date();
        currentRun.error = error instanceof Error ? error.message : String(error);
        
        await this.storage.saveJobRun(currentRun);
        
        const duration = currentRun.endTime.getTime() - currentRun.startTime.getTime();
        const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
        
        this.logger?.error(`Job '${job.name}' failed (attempt ${attempt}/${maxRetries + 1}): ${error}`, {
          job: job.name,
          attempt,
          runId: currentRun.id,
          error: error instanceof Error ? error.message : String(error)
        });

        // Record job failure metric (only for the final failure)
        if (attempt === maxRetries + 1) {
          this.metrics?.recordJobFailed(job.name, this.workerId, duration, errorType);
        }

        // Call error callback if provided
        if (job.options.onError) {
          try {
            await job.options.onError(error as Error);
          } catch (callbackError) {
            this.logger?.warn(`Error callback failed for job '${job.name}': ${callbackError}`, {
              job: job.name,
              runId: currentRun.id
            });
          }
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries + 1) {
          throw new JobExecutionError(job.name, attempt, error as Error);
        }

        // Wait before retry
        const backoffStrategy = this.getBackoffStrategy(job.options.backoff);
        const delay = backoffStrategy.calculate(attempt);
        
        this.logger?.info(`Retrying job '${job.name}' in ${delay}ms`, {
          job: job.name,
          attempt,
          nextAttempt: attempt + 1,
          delay
        });

        await this.sleep(delay);
        
        // Create new run for retry
        currentRun = {
          id: randomUUID(),
          jobName: job.name,
          status: 'pending',
          attempt: attempt + 1
        };
        
      } finally {
        clearInterval(lockExtender);
      }
    }

    return currentRun;
  }

  private async executeJobHandler(job: Job): Promise<any> {
    const timeout = job.options.timeout;
    
    if (!timeout) {
      return await job.handler();
    }

    // Execute with timeout
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Job '${job.name}' timed out after ${timeout}ms`));
      }, timeout);

      job.handler()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private getBackoffStrategy(strategy?: string): BackoffStrategy {
    switch (strategy) {
      case 'exponential':
        return new ExponentialBackoffStrategy();
      case 'fixed':
      default:
        return new FixedBackoffStrategy();
    }
  }

  private async acquireJobLock(jobName: string): Promise<boolean> {
    try {
      return await this.storage.acquireLock(jobName, this.workerId, this.lockTTL);
    } catch (error) {
      this.logger?.error(`Failed to acquire lock for job '${jobName}': ${error}`, {
        job: jobName,
        workerId: this.workerId
      });
      return false;
    }
  }

  private async releaseJobLock(jobName: string): Promise<void> {
    try {
      await this.storage.releaseLock(jobName, this.workerId);
    } catch (error) {
      this.logger?.error(`Failed to release lock for job '${jobName}': ${error}`, {
        job: jobName,
        workerId: this.workerId
      });
    }
  }

  private setupLockExtension(jobName: string): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        const extended = await this.storage.extendLock(jobName, this.workerId, this.lockTTL);
        if (!extended) {
          this.logger?.warn(`Failed to extend lock for job '${jobName}' - may have been taken by another worker`, {
            job: jobName,
            workerId: this.workerId
          });
        }
      } catch (error) {
        this.logger?.error(`Error extending lock for job '${jobName}': ${error}`, {
          job: jobName,
          workerId: this.workerId
        });
      }
    }, this.lockExtendInterval);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}