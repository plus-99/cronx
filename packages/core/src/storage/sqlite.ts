import Database from 'better-sqlite3';
import { StorageAdapter, Job, JobRun, JobStats, StorageError } from '../types.js';

export class SQLiteStorageAdapter implements StorageAdapter {
  private db: Database.Database | null = null;

  constructor(private dbPath: string) {}

  async connect(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
      this.initTables();
    } catch (error) {
      throw new StorageError(`Failed to connect to SQLite database: ${error}`, error as Error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private initTables(): void {
    if (!this.db) throw new StorageError('Database not connected');

    // Jobs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        name TEXT PRIMARY KEY,
        schedule TEXT NOT NULL,
        options TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_paused INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        last_run DATETIME,
        next_run DATETIME
      )
    `);

    // Job runs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS job_runs (
        id TEXT PRIMARY KEY,
        job_name TEXT NOT NULL,
        status TEXT NOT NULL,
        start_time DATETIME,
        end_time DATETIME,
        error TEXT,
        result TEXT,
        attempt INTEGER NOT NULL,
        FOREIGN KEY (job_name) REFERENCES jobs (name) ON DELETE CASCADE
      )
    `);

    // Locks table for clustering
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS locks (
        job_name TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL,
        expires_at DATETIME NOT NULL
      )
    `);

    // Indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_job_runs_job_name ON job_runs (job_name)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_job_runs_start_time ON job_runs (start_time)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_locks_expires_at ON locks (expires_at)`);
  }

  async saveJob(job: Job): Promise<void> {
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO jobs 
        (name, schedule, options, is_active, is_paused, created_at, updated_at, last_run, next_run)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        job.name,
        job.schedule,
        JSON.stringify(job.options),
        job.isActive ? 1 : 0,
        job.isPaused ? 1 : 0,
        job.createdAt.toISOString(),
        job.updatedAt.toISOString(),
        job.lastRun?.toISOString() || null,
        job.nextRun?.toISOString() || null
      );
    } catch (error) {
      throw new StorageError(`Failed to save job: ${error}`, error as Error);
    }
  }

  async getJob(name: string): Promise<Job | null> {
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const stmt = this.db.prepare('SELECT * FROM jobs WHERE name = ?');
      const row = stmt.get(name) as any;

      if (!row) return null;

      return {
        name: row.name,
        schedule: row.schedule,
        handler: () => Promise.resolve(), // Will be set by scheduler
        options: JSON.parse(row.options),
        isActive: row.is_active === 1,
        isPaused: row.is_paused === 1,
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
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const stmt = this.db.prepare('SELECT * FROM jobs ORDER BY created_at');
      const rows = stmt.all() as any[];

      return rows.map(row => ({
        name: row.name,
        schedule: row.schedule,
        handler: () => Promise.resolve(), // Will be set by scheduler
        options: JSON.parse(row.options),
        isActive: row.is_active === 1,
        isPaused: row.is_paused === 1,
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
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const stmt = this.db.prepare('DELETE FROM jobs WHERE name = ?');
      const result = stmt.run(name);
      return result.changes > 0;
    } catch (error) {
      throw new StorageError(`Failed to delete job: ${error}`, error as Error);
    }
  }

  async pauseJob(name: string): Promise<boolean> {
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const stmt = this.db.prepare('UPDATE jobs SET is_paused = 1, updated_at = ? WHERE name = ?');
      const result = stmt.run(new Date().toISOString(), name);
      return result.changes > 0;
    } catch (error) {
      throw new StorageError(`Failed to pause job: ${error}`, error as Error);
    }
  }

  async resumeJob(name: string): Promise<boolean> {
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const stmt = this.db.prepare('UPDATE jobs SET is_paused = 0, updated_at = ? WHERE name = ?');
      const result = stmt.run(new Date().toISOString(), name);
      return result.changes > 0;
    } catch (error) {
      throw new StorageError(`Failed to resume job: ${error}`, error as Error);
    }
  }

  async saveJobRun(run: JobRun): Promise<void> {
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO job_runs 
        (id, job_name, status, start_time, end_time, error, result, attempt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        run.id,
        run.jobName,
        run.status,
        run.startTime?.toISOString() || null,
        run.endTime?.toISOString() || null,
        run.error || null,
        run.result ? JSON.stringify(run.result) : null,
        run.attempt
      );
    } catch (error) {
      throw new StorageError(`Failed to save job run: ${error}`, error as Error);
    }
  }

  async getJobRun(id: string): Promise<JobRun | null> {
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const stmt = this.db.prepare('SELECT * FROM job_runs WHERE id = ?');
      const row = stmt.get(id) as any;

      if (!row) return null;

      return {
        id: row.id,
        jobName: row.job_name,
        status: row.status,
        startTime: row.start_time ? new Date(row.start_time) : undefined,
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        error: row.error || undefined,
        result: row.result ? JSON.parse(row.result) : undefined,
        attempt: row.attempt
      };
    } catch (error) {
      throw new StorageError(`Failed to get job run: ${error}`, error as Error);
    }
  }

  async getJobRuns(jobName: string, limit?: number): Promise<JobRun[]> {
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const sql = `
        SELECT * FROM job_runs 
        WHERE job_name = ? 
        ORDER BY start_time DESC
        ${limit ? 'LIMIT ?' : ''}
      `;
      
      const stmt = this.db.prepare(sql);
      const rows = (limit ? stmt.all(jobName, limit) : stmt.all(jobName)) as any[];

      return rows.map(row => ({
        id: row.id,
        jobName: row.job_name,
        status: row.status,
        startTime: row.start_time ? new Date(row.start_time) : undefined,
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        error: row.error || undefined,
        result: row.result ? JSON.parse(row.result) : undefined,
        attempt: row.attempt
      }));
    } catch (error) {
      throw new StorageError(`Failed to get job runs: ${error}`, error as Error);
    }
  }

  async getJobStats(jobName?: string): Promise<JobStats> {
    if (!this.db) throw new StorageError('Database not connected');

    try {
      if (jobName) {
        // Get stats for specific job
        const runsStmt = this.db.prepare(`
          SELECT COUNT(*) as total,
                 SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                 SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                 AVG(CASE WHEN start_time IS NOT NULL AND end_time IS NOT NULL 
                     THEN (julianday(end_time) - julianday(start_time)) * 86400000 
                     ELSE NULL END) as avg_duration
          FROM job_runs WHERE job_name = ?
        `);
        
        const stats = runsStmt.get(jobName) as any;
        
        const jobStmt = this.db.prepare('SELECT last_run, next_run FROM jobs WHERE name = ?');
        const jobInfo = jobStmt.get(jobName) as any;

        return {
          totalRuns: stats.total || 0,
          successfulRuns: stats.successful || 0,
          failedRuns: stats.failed || 0,
          averageDuration: stats.avg_duration || 0,
          lastRun: jobInfo?.last_run ? new Date(jobInfo.last_run) : undefined,
          nextRun: jobInfo?.next_run ? new Date(jobInfo.next_run) : undefined
        };
      } else {
        // Get overall stats
        const runsStmt = this.db.prepare(`
          SELECT COUNT(*) as total,
                 SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                 SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                 AVG(CASE WHEN start_time IS NOT NULL AND end_time IS NOT NULL 
                     THEN (julianday(end_time) - julianday(start_time)) * 86400000 
                     ELSE NULL END) as avg_duration
          FROM job_runs
        `);
        
        const stats = runsStmt.get() as any;

        return {
          totalRuns: stats.total || 0,
          successfulRuns: stats.successful || 0,
          failedRuns: stats.failed || 0,
          averageDuration: stats.avg_duration || 0
        };
      }
    } catch (error) {
      throw new StorageError(`Failed to get job stats: ${error}`, error as Error);
    }
  }

  async acquireLock(jobName: string, workerId: string, ttl: number): Promise<boolean> {
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl);

      // Clean up expired locks
      this.db.prepare('DELETE FROM locks WHERE expires_at < ?').run(now.toISOString());

      // Try to acquire lock
      const stmt = this.db.prepare(`
        INSERT INTO locks (job_name, worker_id, expires_at)
        VALUES (?, ?, ?)
        ON CONFLICT(job_name) DO UPDATE SET
          worker_id = excluded.worker_id,
          expires_at = excluded.expires_at
        WHERE worker_id = excluded.worker_id OR expires_at < ?
      `);

      const result = stmt.run(jobName, workerId, expiresAt.toISOString(), now.toISOString());
      return result.changes > 0;
    } catch (error) {
      // If constraint violation, lock is held by another worker
      return false;
    }
  }

  async releaseLock(jobName: string, workerId: string): Promise<boolean> {
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const stmt = this.db.prepare('DELETE FROM locks WHERE job_name = ? AND worker_id = ?');
      const result = stmt.run(jobName, workerId);
      return result.changes > 0;
    } catch (error) {
      throw new StorageError(`Failed to release lock: ${error}`, error as Error);
    }
  }

  async extendLock(jobName: string, workerId: string, ttl: number): Promise<boolean> {
    if (!this.db) throw new StorageError('Database not connected');

    try {
      const expiresAt = new Date(Date.now() + ttl);
      const stmt = this.db.prepare(`
        UPDATE locks 
        SET expires_at = ? 
        WHERE job_name = ? AND worker_id = ?
      `);
      
      const result = stmt.run(expiresAt.toISOString(), jobName, workerId);
      return result.changes > 0;
    } catch (error) {
      throw new StorageError(`Failed to extend lock: ${error}`, error as Error);
    }
  }
}