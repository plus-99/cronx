import { StorageAdapter, Job, JobRun, StorageError } from '../types.js';

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