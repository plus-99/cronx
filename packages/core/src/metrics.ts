import { register, Counter, Histogram, Gauge } from 'prom-client';
import { Logger } from './types.js';

export class MetricsCollector {
  private enabled: boolean;
  private jobsTotal: Counter<string>;
  private jobsCompleted: Counter<string>;
  private jobsFailed: Counter<string>;
  private jobDuration: Histogram<string>;
  private activeJobs: Gauge<string>;
  private queueSize: Gauge<string>;
  private logger?: Logger;

  constructor(enabled: boolean = false, logger?: Logger) {
    this.enabled = enabled;
    this.logger = logger;

    if (!enabled) {
      // Create no-op metrics
      this.jobsTotal = { inc: () => {}, labels: () => ({ inc: () => {} }) } as any;
      this.jobsCompleted = { inc: () => {}, labels: () => ({ inc: () => {} }) } as any;
      this.jobsFailed = { inc: () => {}, labels: () => ({ inc: () => {} }) } as any;
      this.jobDuration = { observe: () => {}, labels: () => ({ observe: () => {} }) } as any;
      this.activeJobs = { set: () => {}, labels: () => ({ set: () => {} }) } as any;
      this.queueSize = { set: () => {}, labels: () => ({ set: () => {} }) } as any;
      return;
    }

    // Total jobs scheduled
    this.jobsTotal = new Counter({
      name: 'cronx_jobs_total',
      help: 'Total number of jobs scheduled',
      labelNames: ['job_name', 'worker_id']
    });

    // Completed jobs
    this.jobsCompleted = new Counter({
      name: 'cronx_jobs_completed_total',
      help: 'Total number of jobs completed successfully',
      labelNames: ['job_name', 'worker_id']
    });

    // Failed jobs
    this.jobsFailed = new Counter({
      name: 'cronx_jobs_failed_total',
      help: 'Total number of jobs that failed',
      labelNames: ['job_name', 'worker_id', 'error_type']
    });

    // Job execution duration
    this.jobDuration = new Histogram({
      name: 'cronx_job_duration_seconds',
      help: 'Job execution duration in seconds',
      labelNames: ['job_name', 'worker_id', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 300]
    });

    // Currently active jobs
    this.activeJobs = new Gauge({
      name: 'cronx_active_jobs',
      help: 'Number of currently executing jobs',
      labelNames: ['worker_id']
    });

    // Queue size
    this.queueSize = new Gauge({
      name: 'cronx_queue_size',
      help: 'Number of jobs waiting to be executed',
      labelNames: ['worker_id']
    });

    this.logger?.info('Prometheus metrics initialized');
  }

  recordJobScheduled(jobName: string, workerId: string): void {
    if (!this.enabled) return;
    this.jobsTotal.labels(jobName, workerId).inc();
  }

  recordJobStarted(jobName: string, workerId: string): void {
    if (!this.enabled) return;
    this.activeJobs.labels(workerId).inc();
  }

  recordJobCompleted(jobName: string, workerId: string, duration: number): void {
    if (!this.enabled) return;
    this.jobsCompleted.labels(jobName, workerId).inc();
    this.jobDuration.labels(jobName, workerId, 'completed').observe(duration / 1000);
    this.activeJobs.labels(workerId).dec();
  }

  recordJobFailed(jobName: string, workerId: string, duration: number, errorType: string): void {
    if (!this.enabled) return;
    this.jobsFailed.labels(jobName, workerId, errorType).inc();
    this.jobDuration.labels(jobName, workerId, 'failed').observe(duration / 1000);
    this.activeJobs.labels(workerId).dec();
  }

  updateQueueSize(workerId: string, size: number): void {
    if (!this.enabled) return;
    this.queueSize.labels(workerId).set(size);
  }

  getMetrics(): string {
    if (!this.enabled) return '';
    return register.metrics();
  }

  clearMetrics(): void {
    if (!this.enabled) return;
    register.clear();
  }
}