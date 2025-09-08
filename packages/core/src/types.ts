export interface JobOptions {
  name: string;
  retries?: number;
  backoff?: 'fixed' | 'exponential';
  timeout?: number;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface JobRun {
  id: string;
  jobName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  error?: string;
  result?: any;
  attempt: number;
}

export interface Job {
  name: string;
  schedule: string;
  handler: () => Promise<any>;
  options: JobOptions;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  nextRun?: Date;
}

export interface StorageAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Job management
  saveJob(job: Job): Promise<void>;
  getJob(name: string): Promise<Job | null>;
  listJobs(): Promise<Job[]>;
  deleteJob(name: string): Promise<boolean>;
  
  // Job runs
  saveJobRun(run: JobRun): Promise<void>;
  getJobRun(id: string): Promise<JobRun | null>;
  getJobRuns(jobName: string, limit?: number): Promise<JobRun[]>;
  
  // Locking for clustering
  acquireLock(jobName: string, workerId: string, ttl: number): Promise<boolean>;
  releaseLock(jobName: string, workerId: string): Promise<boolean>;
  extendLock(jobName: string, workerId: string, ttl: number): Promise<boolean>;
}

export interface CronxConfig {
  storage: string | StorageAdapter;
  workerId?: string;
  metrics?: boolean;
  timezone?: string;
  logger?: Logger;
}

export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface BackoffStrategy {
  calculate(attempt: number, baseDelay?: number): number;
}

export class CronxError extends Error {
  constructor(message: string, public code?: string, public cause?: Error) {
    super(message);
    this.name = 'CronxError';
  }
}

export class JobExecutionError extends CronxError {
  constructor(jobName: string, attempt: number, cause: Error) {
    super(`Job '${jobName}' failed on attempt ${attempt}: ${cause.message}`, 'JOB_EXECUTION_ERROR', cause);
    this.name = 'JobExecutionError';
  }
}

export class StorageError extends CronxError {
  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_ERROR', cause);
    this.name = 'StorageError';
  }
}