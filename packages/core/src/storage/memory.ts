import { StorageAdapter, Job, JobRun, JobStats, StorageError } from '../types.js';

interface LockInfo {
  workerId: string;
  expiresAt: Date;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private jobs = new Map<string, Job>();
  private jobRuns = new Map<string, JobRun>();
  private locks = new Map<string, LockInfo>();

  async connect(): Promise<void> {
    // No-op for memory storage
  }

  async disconnect(): Promise<void> {
    this.jobs.clear();
    this.jobRuns.clear();
    this.locks.clear();
  }

  async saveJob(job: Job): Promise<void> {
    this.jobs.set(job.name, { ...job });
  }

  async pauseJob(name: string): Promise<boolean> {
    const job = this.jobs.get(name);
    if (job) {
      job.isPaused = true;
      job.updatedAt = new Date();
      return true;
    }
    return false;
  }

  async resumeJob(name: string): Promise<boolean> {
    const job = this.jobs.get(name);
    if (job) {
      job.isPaused = false;
      job.updatedAt = new Date();
      return true;
    }
    return false;
  }

  async getJob(name: string): Promise<Job | null> {
    const job = this.jobs.get(name);
    return job ? { ...job } : null;
  }

  async listJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values()).map(job => ({ ...job }));
  }

  async deleteJob(name: string): Promise<boolean> {
    return this.jobs.delete(name);
  }

  async saveJobRun(run: JobRun): Promise<void> {
    this.jobRuns.set(run.id, { ...run });
  }

  async getJobRun(id: string): Promise<JobRun | null> {
    const run = this.jobRuns.get(id);
    return run ? { ...run } : null;
  }

  async getJobRuns(jobName: string, limit?: number): Promise<JobRun[]> {
    const runs = Array.from(this.jobRuns.values())
      .filter(run => run.jobName === jobName)
      .sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0));
    
    return limit ? runs.slice(0, limit) : runs;
  }

  async getJobStats(jobName?: string): Promise<JobStats> {
    if (jobName) {
      const runs = await this.getJobRuns(jobName);
      const successful = runs.filter(r => r.status === 'completed').length;
      const failed = runs.filter(r => r.status === 'failed').length;
      const durations = runs
        .filter(r => r.startTime && r.endTime)
        .map(r => r.endTime!.getTime() - r.startTime!.getTime());
      
      const job = this.jobs.get(jobName);
      
      return {
        totalRuns: runs.length,
        successfulRuns: successful,
        failedRuns: failed,
        averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        lastRun: job?.lastRun,
        nextRun: job?.nextRun
      };
    } else {
      const allRuns = Array.from(this.jobRuns.values());
      const successful = allRuns.filter(r => r.status === 'completed').length;
      const failed = allRuns.filter(r => r.status === 'failed').length;
      const durations = allRuns
        .filter(r => r.startTime && r.endTime)
        .map(r => r.endTime!.getTime() - r.startTime!.getTime());
      
      return {
        totalRuns: allRuns.length,
        successfulRuns: successful,
        failedRuns: failed,
        averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
      };
    }
  }

  async acquireLock(jobName: string, workerId: string, ttl: number): Promise<boolean> {
    const existing = this.locks.get(jobName);
    const now = new Date();

    // Check if lock exists and is not expired
    if (existing && existing.expiresAt > now) {
      return existing.workerId === workerId;
    }

    // Acquire new lock
    this.locks.set(jobName, {
      workerId,
      expiresAt: new Date(now.getTime() + ttl)
    });

    return true;
  }

  async releaseLock(jobName: string, workerId: string): Promise<boolean> {
    const existing = this.locks.get(jobName);
    
    if (existing && existing.workerId === workerId) {
      this.locks.delete(jobName);
      return true;
    }

    return false;
  }

  async extendLock(jobName: string, workerId: string, ttl: number): Promise<boolean> {
    const existing = this.locks.get(jobName);
    
    if (existing && existing.workerId === workerId) {
      existing.expiresAt = new Date(Date.now() + ttl);
      return true;
    }

    return false;
  }
}