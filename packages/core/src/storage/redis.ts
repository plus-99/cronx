import { createClient, RedisClientType } from 'redis';
import { StorageAdapter, Job, JobRun, JobStats, StorageError } from '../types.js';

export class RedisStorageAdapter implements StorageAdapter {
  private client: RedisClientType | null = null;

  constructor(private connectionString: string) {}

  async connect(): Promise<void> {
    try {
      this.client = createClient({ url: this.connectionString });
      await this.client.connect();
    } catch (error) {
      throw new StorageError(`Failed to connect to Redis: ${error}`, error as Error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  private getJobKey(name: string): string {
    return `cronx:job:${name}`;
  }

  private getJobRunKey(id: string): string {
    return `cronx:run:${id}`;
  }

  private getJobRunsKey(jobName: string): string {
    return `cronx:runs:${jobName}`;
  }

  private getLockKey(jobName: string): string {
    return `cronx:lock:${jobName}`;
  }

  async saveJob(job: Job): Promise<void> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const jobData = {
        name: job.name,
        schedule: job.schedule,
        options: JSON.stringify(job.options),
        isActive: job.isActive.toString(),
        isPaused: job.isPaused.toString(),
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        lastRun: job.lastRun?.toISOString() || '',
        nextRun: job.nextRun?.toISOString() || ''
      };

      await this.client.hSet(this.getJobKey(job.name), jobData);
      await this.client.sAdd('cronx:jobs', job.name);
    } catch (error) {
      throw new StorageError(`Failed to save job: ${error}`, error as Error);
    }
  }

  async getJob(name: string): Promise<Job | null> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const jobData = await this.client.hGetAll(this.getJobKey(name));
      
      if (Object.keys(jobData).length === 0) return null;

      return {
        name: jobData.name,
        schedule: jobData.schedule,
        handler: () => Promise.resolve(), // Will be set by scheduler
        options: JSON.parse(jobData.options),
        isActive: jobData.isActive === 'true',
        isPaused: jobData.isPaused === 'true',
        createdAt: new Date(jobData.createdAt),
        updatedAt: new Date(jobData.updatedAt),
        lastRun: jobData.lastRun && jobData.lastRun !== '' ? new Date(jobData.lastRun) : undefined,
        nextRun: jobData.nextRun && jobData.nextRun !== '' ? new Date(jobData.nextRun) : undefined
      };
    } catch (error) {
      throw new StorageError(`Failed to get job: ${error}`, error as Error);
    }
  }

  async listJobs(): Promise<Job[]> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const jobNames = await this.client.sMembers('cronx:jobs');
      const jobs: Job[] = [];

      for (const name of jobNames) {
        const job = await this.getJob(name);
        if (job) jobs.push(job);
      }

      return jobs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      throw new StorageError(`Failed to list jobs: ${error}`, error as Error);
    }
  }

  async deleteJob(name: string): Promise<boolean> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const deleted = await this.client.del(this.getJobKey(name));
      await this.client.sRem('cronx:jobs', name);
      
      // Clean up job runs
      const runIds = await this.client.lRange(this.getJobRunsKey(name), 0, -1);
      if (runIds.length > 0) {
        const runKeys = runIds.map(id => this.getJobRunKey(id));
        await this.client.del(runKeys);
        await this.client.del(this.getJobRunsKey(name));
      }

      return deleted > 0;
    } catch (error) {
      throw new StorageError(`Failed to delete job: ${error}`, error as Error);
    }
  }

  async pauseJob(name: string): Promise<boolean> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const jobKey = this.getJobKey(name);
      await this.client.hSet(jobKey, 'isPaused', 'true');
      await this.client.hSet(jobKey, 'updatedAt', new Date().toISOString());
      return true;
    } catch (error) {
      throw new StorageError(`Failed to pause job: ${error}`, error as Error);
    }
  }

  async resumeJob(name: string): Promise<boolean> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const jobKey = this.getJobKey(name);
      await this.client.hSet(jobKey, 'isPaused', 'false');
      await this.client.hSet(jobKey, 'updatedAt', new Date().toISOString());
      return true;
    } catch (error) {
      throw new StorageError(`Failed to resume job: ${error}`, error as Error);
    }
  }

  async getJobStats(jobName?: string): Promise<JobStats> {
    // Simplified implementation for now
    return {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      averageDuration: 0
    };
  }

  async saveJobRun(run: JobRun): Promise<void> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const runData = {
        id: run.id,
        jobName: run.jobName,
        status: run.status,
        startTime: run.startTime?.toISOString() || '',
        endTime: run.endTime?.toISOString() || '',
        error: run.error || '',
        result: run.result ? JSON.stringify(run.result) : '',
        attempt: run.attempt.toString()
      };

      await this.client.hSet(this.getJobRunKey(run.id), runData);
      await this.client.lPush(this.getJobRunsKey(run.jobName), run.id);
      
      // Keep only last 100 runs
      await this.client.lTrim(this.getJobRunsKey(run.jobName), 0, 99);
    } catch (error) {
      throw new StorageError(`Failed to save job run: ${error}`, error as Error);
    }
  }

  async getJobRun(id: string): Promise<JobRun | null> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const runData = await this.client.hGetAll(this.getJobRunKey(id));
      
      if (Object.keys(runData).length === 0) return null;

      return {
        id: runData.id,
        jobName: runData.jobName,
        status: runData.status as any,
        startTime: runData.startTime && runData.startTime !== '' ? new Date(runData.startTime) : undefined,
        endTime: runData.endTime && runData.endTime !== '' ? new Date(runData.endTime) : undefined,
        error: runData.error && runData.error !== '' ? runData.error : undefined,
        result: runData.result && runData.result !== '' ? JSON.parse(runData.result) : undefined,
        attempt: parseInt(runData.attempt)
      };
    } catch (error) {
      throw new StorageError(`Failed to get job run: ${error}`, error as Error);
    }
  }

  async getJobRuns(jobName: string, limit?: number): Promise<JobRun[]> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const runIds = await this.client.lRange(
        this.getJobRunsKey(jobName), 
        0, 
        limit ? limit - 1 : -1
      );
      
      const runs: JobRun[] = [];
      for (const id of runIds) {
        const run = await this.getJobRun(id);
        if (run) runs.push(run);
      }

      return runs;
    } catch (error) {
      throw new StorageError(`Failed to get job runs: ${error}`, error as Error);
    }
  }

  async acquireLock(jobName: string, workerId: string, ttl: number): Promise<boolean> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const lockKey = this.getLockKey(jobName);
      const result = await this.client.set(lockKey, workerId, {
        PX: ttl, // TTL in milliseconds
        NX: true // Only set if key doesn't exist
      });

      return result === 'OK';
    } catch (error) {
      throw new StorageError(`Failed to acquire lock: ${error}`, error as Error);
    }
  }

  async releaseLock(jobName: string, workerId: string): Promise<boolean> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const lockKey = this.getLockKey(jobName);
      
      // Use Lua script to atomically check and delete
      const script = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;
      
      const result = await this.client.eval(script, {
        keys: [lockKey],
        arguments: [workerId]
      }) as number;

      return result === 1;
    } catch (error) {
      throw new StorageError(`Failed to release lock: ${error}`, error as Error);
    }
  }

  async extendLock(jobName: string, workerId: string, ttl: number): Promise<boolean> {
    if (!this.client) throw new StorageError('Redis client not connected');

    try {
      const lockKey = this.getLockKey(jobName);
      
      // Use Lua script to atomically check owner and extend TTL
      const script = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("PEXPIRE", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;
      
      const result = await this.client.eval(script, {
        keys: [lockKey],
        arguments: [workerId, ttl.toString()]
      }) as number;

      return result === 1;
    } catch (error) {
      throw new StorageError(`Failed to extend lock: ${error}`, error as Error);
    }
  }
}