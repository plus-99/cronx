# @plus99/cronx

> Reliable, distributed-ready cron job scheduler for Node.js

A drop-in replacement for `node-cron` with persistence, clustering support, and comprehensive observability features.

## 🎯 Features

- **Reliable**: Jobs are persisted and survive restarts
- **Distributed**: Clustering support with distributed locking
- **Multiple Storage Backends**: Memory, SQLite, PostgreSQL, Redis
- **Retry Logic**: Configurable retry strategies with backoff
- **TypeScript**: Full TypeScript support with type definitions
- **Observability**: Built-in logging and job execution history
- **CLI**: Command-line interface for job management

## 📦 Installation

```bash
npm install @plus99/cronx
```

## 🚀 Quick Start

```typescript
import { Cronx } from '@plus99/cronx';

const cronx = new Cronx({
  storage: 'sqlite://./cronx.db'  // or memory://, postgres://, redis://
});

// Schedule a simple job
await cronx.schedule('*/1 * * * *', async () => {
  console.log('Heartbeat:', new Date());
  return { status: 'ok' };
}, { name: 'heartbeat' });

// Schedule a job with retries
await cronx.schedule('0 */6 * * *', async () => {
  // Your job logic here
  return { processed: 100 };
}, {
  name: 'data-sync',
  retries: 3,
  backoff: 'exponential',
  timeout: 30000
});

// Start the scheduler
await cronx.start();
```

## 📚 Storage Configuration

### Memory (Development)
```typescript
const cronx = new Cronx({
  storage: 'memory://'
});
```

### SQLite (Single Instance)
```typescript
const cronx = new Cronx({
  storage: 'sqlite://./cronx.db'
});
```

### PostgreSQL (Production/Clustering)
```typescript
const cronx = new Cronx({
  storage: 'postgres://user:password@localhost:5432/cronx'
});
```

### Redis (High Performance)
```typescript
const cronx = new Cronx({
  storage: 'redis://localhost:6379'
});
```

## 🔧 API Reference

### Constructor Options

```typescript
interface CronxConfig {
  storage: string | StorageAdapter;
  workerId?: string;              // Unique worker identifier
  metrics?: boolean;              // Enable metrics collection
  timezone?: string;              // Timezone for cron expressions
  logger?: Logger;                // Custom logger implementation
}
```

### Job Options

```typescript
interface JobOptions {
  name: string;                   // Unique job identifier
  retries?: number;               // Number of retry attempts (default: 0)
  backoff?: 'fixed' | 'exponential'; // Retry strategy (default: 'fixed')
  timeout?: number;               // Job timeout in milliseconds
  onSuccess?: (result: any) => void;  // Success callback
  onError?: (error: Error) => void;   // Error callback
}
```

### Methods

#### `schedule(cron, handler, options)`
Schedule a new cron job.

```typescript
await cronx.schedule('0 */2 * * *', async () => {
  // Job logic
}, { name: 'my-job', retries: 2 });
```

#### `unschedule(name)`
Remove a scheduled job.

```typescript
await cronx.unschedule('my-job');
```

#### `start()`
Start the cron scheduler.

```typescript
await cronx.start();
```

#### `stop()`
Stop the cron scheduler.

```typescript
await cronx.stop();
```

#### `runJob(name)`
Manually trigger a job execution.

```typescript
const result = await cronx.runJob('my-job');
```

#### `listJobs()`
Get all scheduled jobs.

```typescript
const jobs = await cronx.listJobs();
```

#### `getJobRuns(name, limit?)`
Get execution history for a job.

```typescript
const runs = await cronx.getJobRuns('my-job', 10);
```

## 🖥️ CLI Usage

Install the CLI globally:

```bash
npm install -g @plus99/cronx-cli
```

### List Jobs
```bash
cronx list --storage sqlite://./cronx.db
```

### Run Job Manually
```bash
cronx run my-job --storage sqlite://./cronx.db
```

## 📅 Cron Expression Format

Cronx supports standard cron expressions with optional seconds precision:

```
# Standard 5-field format (minute hour day month weekday)
0 */2 * * *        # Every 2 hours

# 6-field format with seconds (second minute hour day month weekday)
*/30 * * * * *     # Every 30 seconds
0 0 */12 * * *     # Every 12 hours
```

## 🔄 Retry Strategies

### Fixed Backoff
Consistent delay between retries:

```typescript
{
  retries: 3,
  backoff: 'fixed'  // 1 second delay between retries
}
```

### Exponential Backoff
Increasing delay with each retry:

```typescript
{
  retries: 5,
  backoff: 'exponential'  // 1s, 2s, 4s, 8s, 16s delays
}
```

## 🎯 Clustering

When running multiple instances, Cronx ensures only one worker executes each job:

```typescript
// Worker 1
const cronx1 = new Cronx({
  storage: 'postgres://...',
  workerId: 'worker-1'
});

// Worker 2
const cronx2 = new Cronx({
  storage: 'postgres://...',  // Same database
  workerId: 'worker-2'
});

// Both workers can schedule the same job, but only one will execute it
await cronx1.schedule('*/5 * * * *', handler, { name: 'shared-job' });
await cronx2.schedule('*/5 * * * *', handler, { name: 'shared-job' });
```

## 📊 Job Execution States

Jobs progress through these states:

- `pending` - Scheduled but not yet started
- `running` - Currently executing
- `completed` - Finished successfully
- `failed` - Failed after all retries

## 🛡️ Error Handling

```typescript
try {
  await cronx.schedule('invalid-cron', handler, { name: 'bad-job' });
} catch (error) {
  if (error instanceof CronxError) {
    console.error('Configuration error:', error.message);
  }
}

// Job-level error handling
await cronx.schedule('0 * * * *', async () => {
  throw new Error('Something went wrong');
}, {
  name: 'failing-job',
  retries: 3,
  onError: (error) => {
    console.error('Job failed:', error.message);
  }
});
```

## 📈 Monitoring

Get scheduler statistics:

```typescript
const stats = await cronx.getStats();
console.log({
  totalJobs: stats.totalJobs,
  activeJobs: stats.activeJobs,
  workerId: stats.workerId,
  isRunning: stats.isRunning
});
```

View upcoming job executions:

```typescript
const upcoming = cronx.getUpcomingRuns('my-job', 5);
console.log('Next 5 executions:', upcoming);
```

## 🏃‍♂️ Examples

The repository includes working examples:

```bash
# Basic usage with in-memory storage
npm run example:basic

# SQLite persistence example
npm run example:sqlite

# Clustering demonstration
npm run example:cluster
```

## 🤝 Comparison

| Feature            | node-cron | Agenda.js  | BullMQ    | **cronx**                 |
| ------------------ | --------- | ---------- | --------- | ------------------------- |
| Persistence        | ❌         | ✅ (Mongo)  | ✅ (Redis) | ✅ (SQLite/Postgres/Redis) |
| Simple Cron Syntax | ✅         | ✅          | ❌         | ✅                         |
| Clustering         | ❌         | ⚠️ Limited | ✅         | ✅                         |
| Retries/Backoff    | ❌         | ✅          | ✅         | ✅                         |
| UI Dashboard       | ❌         | ❌          | 3rd party | ✅ (CLI)                   |
| TypeScript         | ⚠️         | ⚠️          | ✅         | ✅                         |

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.