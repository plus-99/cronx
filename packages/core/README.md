# @plus99/cronx

A reliable, distributed-ready cron job scheduler for Node.js designed as a drop-in replacement for node-cron.

## Features

- 🕒 **Seconds precision cron support** - Supports standard and extended cron expressions with seconds
- 💾 **Multiple storage backends** - Memory, SQLite, PostgreSQL, Redis
- 🔄 **Automatic retries** - Configurable retry mechanisms with fixed/exponential backoff
- 🔒 **Distributed locking** - Prevents duplicate execution across multiple workers
- 📊 **Built-in metrics** - Prometheus metrics for monitoring and observability
- ⏰ **Timeout handling** - Job cancellation with configurable timeouts
- 🎯 **TypeScript support** - Full type definitions included

## Installation

```bash
npm install @plus99/cronx
```

## Quick Start

```javascript
import { Cronx } from '@plus99/cronx';

// Create scheduler with in-memory storage
const cronx = new Cronx({
  storage: 'memory://',
  workerId: 'my-worker'
});

// Schedule a job
await cronx.schedule('*/5 * * * * *', async () => {
  console.log('Job executed every 5 seconds!');
  return { status: 'success' };
}, {
  name: 'my-job',
  retries: 3,
  timeout: 10000
});

// Start the scheduler
await cronx.start();
```

## Storage Backends

### Memory (Development)
```javascript
const cronx = new Cronx({ storage: 'memory://' });
```

### SQLite (Single Instance)
```javascript
const cronx = new Cronx({ storage: 'sqlite://./jobs.db' });
```

### PostgreSQL (Production)
```javascript
const cronx = new Cronx({ 
  storage: 'postgresql://user:password@localhost:5432/cronx' 
});
```

### Redis (High Performance)
```javascript
const cronx = new Cronx({ storage: 'redis://localhost:6379' });
```

## Job Configuration

```javascript
await cronx.schedule('0 9 * * 1', jobFunction, {
  name: 'weekly-report',
  retries: 5,
  backoff: 'exponential',
  timeout: 30000,
  onSuccess: (result) => console.log('Success:', result),
  onError: (error) => console.error('Failed:', error)
});
```

### Options

- `name` - Unique job identifier
- `retries` - Number of retry attempts (default: 0)
- `backoff` - Retry strategy: 'fixed' or 'exponential' (default: 'fixed')
- `timeout` - Job timeout in milliseconds (default: 30000)
- `onSuccess` - Success callback function
- `onError` - Error callback function

## Job Management

```javascript
// Pause a job
await cronx.pauseJob('my-job');

// Resume a job
await cronx.resumeJob('my-job');

// Run a job immediately
await cronx.runJobNow('my-job');

// Remove a job
await cronx.unschedule('my-job');

// Get job details
const job = await cronx.getJob('my-job');

// List all jobs
const jobs = await cronx.listJobs();
```

## Monitoring & Statistics

```javascript
// Get overall statistics
const stats = await cronx.getStats();
console.log(stats);
// { totalJobs: 5, activeJobs: 3, pausedJobs: 2, isRunning: true }

// Get job-specific statistics
const jobStats = await cronx.getJobStats('my-job');
console.log(jobStats);
// { totalRuns: 100, successfulRuns: 95, failedRuns: 5, averageDuration: 1250 }

// Get job execution history
const runs = await cronx.getJobRuns('my-job', 10);
console.log(runs);
```

## Prometheus Metrics

Enable metrics collection for monitoring:

```javascript
const cronx = new Cronx({
  storage: 'redis://localhost:6379',
  metrics: true
});

// Get metrics in Prometheus format
const metrics = await cronx.getMetrics();
```

Available metrics:
- `cronx_jobs_total` - Total number of scheduled jobs
- `cronx_job_executions_total` - Total job executions by status
- `cronx_job_duration_seconds` - Job execution duration histogram
- `cronx_active_jobs` - Currently active jobs gauge

## Cron Expressions

Cronx supports both standard 5-field and extended 6-field cron expressions:

```javascript
// Standard format (minute hour day month weekday)
'0 9 * * 1'        // Every Monday at 9:00 AM
'*/15 * * * *'     // Every 15 minutes

// Extended format with seconds (second minute hour day month weekday)
'*/30 * * * * *'   // Every 30 seconds
'0 0 12 * * 1-5'   // Weekdays at noon
```

## Error Handling

```javascript
try {
  await cronx.schedule('invalid-cron', async () => {});
} catch (error) {
  console.error('Invalid cron expression:', error.message);
}

// Job-level error handling
await cronx.schedule('*/5 * * * *', async () => {
  // Job might fail
  if (Math.random() > 0.8) {
    throw new Error('Random failure');
  }
  return { success: true };
}, {
  name: 'failing-job',
  retries: 3,
  onError: (error, attempt) => {
    console.log(`Attempt ${attempt} failed:`, error.message);
  }
});
```

## Distributed Execution

When running multiple Cronx instances with shared storage, distributed locking ensures only one instance executes each job:

```javascript
// Worker 1
const worker1 = new Cronx({
  storage: 'postgresql://localhost/cronx',
  workerId: 'worker-1'
});

// Worker 2
const worker2 = new Cronx({
  storage: 'postgresql://localhost/cronx',
  workerId: 'worker-2'
});

// Both schedule the same job - only one will execute at a time
await worker1.schedule('*/1 * * * *', jobFunction, { name: 'shared-job' });
await worker2.schedule('*/1 * * * *', jobFunction, { name: 'shared-job' });
```

## API Reference

### Constructor

```typescript
new Cronx(options: CronxOptions)
```

### Methods

- `start()` - Start the scheduler
- `stop()` - Stop the scheduler
- `schedule(schedule, handler, options)` - Schedule a new job
- `unschedule(name)` - Remove a job
- `pauseJob(name)` - Pause a job
- `resumeJob(name)` - Resume a job
- `runJobNow(name)` - Execute a job immediately
- `getJob(name)` - Get job details
- `listJobs()` - List all jobs
- `getStats()` - Get system statistics
- `getJobStats(name?)` - Get job statistics
- `getJobRuns(name, limit?)` - Get job execution history
- `getMetrics()` - Get Prometheus metrics

## License

MIT License - see LICENSE file for details.