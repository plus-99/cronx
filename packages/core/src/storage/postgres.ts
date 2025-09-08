import { Client } from 'pg';
import { StorageAdapter, Job, JobRun, StorageError } from '../types.js';

export class PostgresStorageAdapter implements StorageAdapter {
  private client: Client | null = null;

  constructor(private connectionString: string) {}

  async connect(): Promise<void> {
    try {
      this.client = new Client({ connectionString: this.connectionString });
      await this.client.connect();
      await this.initTables();
    } catch (error) {
      throw new StorageError(`Failed to connect to PostgreSQL: ${error}`, error as Error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  private async initTables(): Promise<void> {
    if (!this.client) throw new StorageError('Database not connected');

    try {
      // Jobs table
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS jobs (
          name TEXT PRIMARY KEY,
          schedule TEXT NOT NULL,
          options JSONB NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          last_run TIMESTAMPTZ,
          next_run TIMESTAMPTZ
        )
      `);

      // Job runs table
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS job_runs (
          id TEXT PRIMARY KEY,
          job_name TEXT NOT NULL REFERENCES jobs(name) ON DELETE CASCADE,
          status TEXT NOT NULL,
          start_time TIMESTAMPTZ,
          end_time TIMESTAMPTZ,
          error TEXT,
          result JSONB,
          attempt INTEGER NOT NULL
        )
      `);

      // Locks table for clustering
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS locks (
          job_name TEXT PRIMARY KEY,
          worker_id TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL
        )
      `);

      // Indexes
      await this.client.query(`CREATE INDEX IF NOT EXISTS idx_job_runs_job_name ON job_runs (job_name)`);
      await this.client.query(`CREATE INDEX IF NOT EXISTS idx_job_runs_start_time ON job_runs (start_time)`);
      await this.client.query(`CREATE INDEX IF NOT EXISTS idx_locks_expires_at ON locks (expires_at)`);
    } catch (error) {
      throw new StorageError(`Failed to initialize tables: ${error}`, error as Error);
    }
  }

  async saveJob(job: Job): Promise<void> {
    if (!this.client) throw new StorageError('Database not connected');

    try {
      await this.client.query(`
        INSERT INTO jobs (name, schedule, options, is_active, created_at, updated_at, last_run, next_run)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (name) DO UPDATE SET
          schedule = EXCLUDED.schedule,
          options = EXCLUDED.options,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at,
          last_run = EXCLUDED.last_run,
          next_run = EXCLUDED.next_run
      `, [
        job.name,
        job.schedule,
        JSON.stringify(job.options),
        job.isActive,
        job.createdAt,
        job.updatedAt,
        job.lastRun || null,
        job.nextRun || null
      ]);
    } catch (error) {
      throw new StorageError(`Failed to save job: ${error}`, error as Error);
    }
  }

  async getJob(name: string): Promise<Job | null> {
    if (!this.client) throw new StorageError('Database not connected');

    try {
      const result = await this.client.query('SELECT * FROM jobs WHERE name = $1', [name]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        name: row.name,
        schedule: row.schedule,
        handler: () => Promise.resolve(), // Will be set by scheduler
        options: row.options,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastRun: row.last_run ? new Date(row.last_run) : undefined,
        nextRun: row.next_run ? new Date(row.next_run) : undefined
      };
    } catch (error) {
      throw new StorageError(`Failed to get job: ${error}`, error as Error);
    }
  }

  async listJobs(): Promise<Job[]> {
    if (!this.client) throw new StorageError('Database not connected');

    try {
      const result = await this.client.query('SELECT * FROM jobs ORDER BY created_at');
      
      return result.rows.map(row => ({
        name: row.name,
        schedule: row.schedule,
        handler: () => Promise.resolve(), // Will be set by scheduler
        options: row.options,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastRun: row.last_run ? new Date(row.last_run) : undefined,
        nextRun: row.next_run ? new Date(row.next_run) : undefined
      }));
    } catch (error) {
      throw new StorageError(`Failed to list jobs: ${error}`, error as Error);
    }
  }

  async deleteJob(name: string): Promise<boolean> {
    if (!this.client) throw new StorageError('Database not connected');

    try {
      const result = await this.client.query('DELETE FROM jobs WHERE name = $1', [name]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      throw new StorageError(`Failed to delete job: ${error}`, error as Error);
    }
  }

  async saveJobRun(run: JobRun): Promise<void> {
    if (!this.client) throw new StorageError('Database not connected');

    try {
      await this.client.query(`
        INSERT INTO job_runs (id, job_name, status, start_time, end_time, error, result, attempt)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          error = EXCLUDED.error,
          result = EXCLUDED.result,
          attempt = EXCLUDED.attempt
      `, [
        run.id,
        run.jobName,
        run.status,
        run.startTime || null,
        run.endTime || null,
        run.error || null,
        run.result ? JSON.stringify(run.result) : null,
        run.attempt
      ]);
    } catch (error) {
      throw new StorageError(`Failed to save job run: ${error}`, error as Error);
    }
  }

  async getJobRun(id: string): Promise<JobRun | null> {
    if (!this.client) throw new StorageError('Database not connected');

    try {
      const result = await this.client.query('SELECT * FROM job_runs WHERE id = $1', [id]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        jobName: row.job_name,
        status: row.status,
        startTime: row.start_time ? new Date(row.start_time) : undefined,
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        error: row.error || undefined,
        result: row.result || undefined,
        attempt: row.attempt
      };
    } catch (error) {
      throw new StorageError(`Failed to get job run: ${error}`, error as Error);
    }
  }

  async getJobRuns(jobName: string, limit?: number): Promise<JobRun[]> {
    if (!this.client) throw new StorageError('Database not connected');

    try {
      const sql = `
        SELECT * FROM job_runs 
        WHERE job_name = $1 
        ORDER BY start_time DESC
        ${limit ? 'LIMIT $2' : ''}
      `;
      
      const params = limit ? [jobName, limit] : [jobName];
      const result = await this.client.query(sql, params);

      return result.rows.map(row => ({
        id: row.id,
        jobName: row.job_name,
        status: row.status,
        startTime: row.start_time ? new Date(row.start_time) : undefined,
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        error: row.error || undefined,
        result: row.result || undefined,
        attempt: row.attempt
      }));
    } catch (error) {
      throw new StorageError(`Failed to get job runs: ${error}`, error as Error);
    }
  }

  async acquireLock(jobName: string, workerId: string, ttl: number): Promise<boolean> {
    if (!this.client) throw new StorageError('Database not connected');

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl);

      // Clean up expired locks
      await this.client.query('DELETE FROM locks WHERE expires_at < $1', [now]);

      // Try to acquire lock
      const result = await this.client.query(`
        INSERT INTO locks (job_name, worker_id, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (job_name) DO UPDATE SET
          worker_id = EXCLUDED.worker_id,
          expires_at = EXCLUDED.expires_at
        WHERE locks.worker_id = $2 OR locks.expires_at < $4
        RETURNING job_name
      `, [jobName, workerId, expiresAt, now]);

      return (result.rowCount || 0) > 0;
    } catch (error) {
      // If constraint violation, lock is held by another worker
      return false;
    }
  }

  async releaseLock(jobName: string, workerId: string): Promise<boolean> {
    if (!this.client) throw new StorageError('Database not connected');

    try {
      const result = await this.client.query(
        'DELETE FROM locks WHERE job_name = $1 AND worker_id = $2',
        [jobName, workerId]
      );
      return (result.rowCount || 0) > 0;
    } catch (error) {
      throw new StorageError(`Failed to release lock: ${error}`, error as Error);
    }
  }

  async extendLock(jobName: string, workerId: string, ttl: number): Promise<boolean> {
    if (!this.client) throw new StorageError('Database not connected');

    try {
      const expiresAt = new Date(Date.now() + ttl);
      const result = await this.client.query(`
        UPDATE locks 
        SET expires_at = $1 
        WHERE job_name = $2 AND worker_id = $3
      `, [expiresAt, jobName, workerId]);
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      throw new StorageError(`Failed to extend lock: ${error}`, error as Error);
    }
  }
}