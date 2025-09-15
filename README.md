# Cronx

[![npm version](https://badge.fury.io/js/@plus99%2Fcronx.svg)](https://www.npmjs.com/package/@plus99/cronx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A reliable, distributed-ready cron job scheduler for Node.js designed as a drop-in replacement for node-cron with enterprise features.

## 🚀 Key Features

- **🕒 Seconds Precision** - Extended cron expressions with seconds support
- **💾 Multiple Storage Backends** - Memory, SQLite, PostgreSQL, Redis
- **🔄 Automatic Retries** - Configurable retry mechanisms with backoff strategies
- **🔒 Distributed Locking** - Prevents duplicate execution across multiple workers
- **📊 Built-in Observability** - Prometheus metrics and comprehensive monitoring
- **⏰ Timeout Handling** - Job cancellation with configurable timeouts
- **🎯 Full TypeScript Support** - Complete type definitions included
- **🌐 Web Dashboard** - Real-time monitoring and management interface
- **⌨️ CLI Tools** - Command-line interface for job management
- **🔧 Production Ready** - Battle-tested reliability and performance

## 📦 Packages

This monorepo contains three main packages:

| Package | Description | Documentation |
|---------|-------------|---------------|
| [`@plus99/cronx`](./packages/core) | Core scheduling library | [Core README](./packages/core/README.md) |
| [`@plus99/cronx-cli`](./packages/cli) | Command-line interface | [CLI README](./packages/cli/README.md) |
| [`@plus99/cronx-ui`](./packages/ui) | Web dashboard (private) | [UI README](./packages/ui/README.md) |

## 🔥 Quick Start

### Installation

```bash
# Core library
npm install @plus99/cronx

# CLI tool (optional)
npm install -g @plus99/cronx-cli
```

### Basic Usage

```javascript
import { Cronx } from '@plus99/cronx';

// Create scheduler
const cronx = new Cronx({
  storage: 'memory://',  // or postgresql://, redis://, sqlite://
  workerId: 'my-app'
});

// Start the scheduler FIRST
await cronx.start();

// Schedule jobs AFTER starting
await cronx.schedule('*/5 * * * * *', async () => {
  console.log('Runs every 5 seconds!');
  return { status: 'completed', timestamp: new Date() };
}, {
  name: 'heartbeat',
  retries: 3,
  timeout: 10000
});
```

### Web Dashboard

```bash
# Clone repository
git clone https://github.com/plus-99/cronx.git
cd cronx
npm install

# Start web dashboard
npm run ui
# Open http://localhost:5050
```

### CLI Management

```bash
# List all jobs
cronx list

# Show statistics
cronx stats

# Run a job immediately
cronx run my-job

# View execution history
cronx history my-job
```

## 🎯 Why Cronx?

### vs. node-cron

| Feature | node-cron | Cronx |
|---------|-----------|-------|
| **Persistence** | ❌ Memory only | ✅ Multiple backends |
| **Distributed** | ❌ Single process | ✅ Multi-worker support |
| **Retries** | ❌ No built-in retry | ✅ Configurable retries |
| **Monitoring** | ❌ No metrics | ✅ Prometheus metrics |
| **Web UI** | ❌ No interface | ✅ Full dashboard |
| **CLI Tools** | ❌ No CLI | ✅ Complete CLI |
| **Timeout** | ❌ No timeout handling | ✅ Configurable timeouts |

### vs. Agenda.js

| Feature | Agenda.js | Cronx |
|---------|-----------|-------|
| **Storage** | 🟡 MongoDB only | ✅ Multiple backends |
| **Cron Support** | 🟡 Limited | ✅ Full cron + seconds |
| **TypeScript** | 🟡 Community types | ✅ Built-in types |
| **Distributed** | ✅ Yes | ✅ Yes |
| **Metrics** | ❌ No built-in | ✅ Prometheus ready |
| **Web UI** | ❌ No interface | ✅ Real-time dashboard |

### vs. Bull/BullMQ

| Feature | Bull/BullMQ | Cronx |
|---------|-------------|-------|
| **Cron Jobs** | 🟡 Basic support | ✅ Advanced cron |
| **Storage** | 🟡 Redis only | ✅ Multiple backends |
| **Setup** | 🟡 Complex config | ✅ Simple setup |
| **Monitoring** | 🟡 Separate tools | ✅ Built-in dashboard |
| **Learning Curve** | 🟡 Steep | ✅ Intuitive |

## 🗄️ Storage Backends

### Memory (Development)
- **Use case**: Development, testing, prototyping
- **Persistence**: None (jobs lost on restart)
- **Performance**: Fastest
- **Setup**: Zero configuration

### SQLite (Single Instance)
- **Use case**: Single-server deployments, local applications
- **Persistence**: File-based, survives restarts
- **Performance**: Fast for moderate workloads
- **Setup**: Minimal, just specify file path

### PostgreSQL (Production)
- **Use case**: Production deployments, high availability
- **Persistence**: Full ACID compliance
- **Performance**: Excellent for high concurrency
- **Setup**: Requires PostgreSQL server

### Redis (High Performance)
- **Use case**: High-throughput, distributed systems
- **Persistence**: Optional (RDB/AOF)
- **Performance**: Exceptional speed
- **Setup**: Requires Redis server

## 📊 Monitoring & Observability

### Built-in Metrics

Cronx provides comprehensive Prometheus metrics:

```javascript
const cronx = new Cronx({
  storage: 'postgresql://localhost/cronx',
  metrics: true
});

// Get metrics
const metrics = await cronx.getMetrics();
```

**Available Metrics:**
- `cronx_jobs_total` - Total scheduled jobs
- `cronx_job_executions_total` - Job executions by status
- `cronx_job_duration_seconds` - Execution duration histogram
- `cronx_active_jobs` - Currently active jobs gauge
- `cronx_worker_info` - Worker identification labels

### Web Dashboard

Real-time monitoring with:
- Live job status updates
- Execution success rates
- Performance metrics
- Job management controls
- Execution history

### CLI Monitoring

```bash
# System overview
cronx stats

# Job-specific metrics
cronx stats payment-processor

# Recent execution history
cronx history payment-processor --limit 20
```

## 🔄 Distributed Execution

Cronx handles distributed execution seamlessly:

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

// Both workers schedule the same job
await worker1.schedule('*/1 * * * *', jobHandler, { name: 'shared-job' });
await worker2.schedule('*/1 * * * *', jobHandler, { name: 'shared-job' });

// Only one worker executes at a time due to distributed locking
```

**Benefits:**
- **High Availability** - Jobs continue if workers fail
- **Load Distribution** - Work spreads across workers
- **Zero Conflicts** - Distributed locking prevents duplicates
- **Easy Scaling** - Add workers without configuration

## 🔧 Configuration Examples

### Development Setup

```javascript
const cronx = new Cronx({
  storage: 'memory://',
  workerId: 'dev-worker',
  metrics: false
});
```

### Production Setup

```javascript
const cronx = new Cronx({
  storage: process.env.DATABASE_URL,
  workerId: process.env.WORKER_ID || require('os').hostname(),
  metrics: true,
  logger: {
    level: 'info',
    format: 'json'
  }
});
```

### High-Performance Setup

```javascript
const cronx = new Cronx({
  storage: 'redis://redis-cluster:6379',
  workerId: `worker-${process.env.POD_NAME}`,
  metrics: true,
  concurrency: 10
});
```

## 📋 Examples

The repository includes comprehensive examples:

```bash
# Basic usage
npm run example:basic

# SQLite persistence
npm run example:sqlite

# Clustering demo
npm run example:cluster

# Redis examples
npm run example:redis
npm run example:redis-cluster
npm run example:redis-performance
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/plus-99/cronx.git
cd cronx

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start development
npm run dev
```

### Package Development

```bash
# Core library
npm run dev --workspace=packages/core

# CLI tool
npm run dev --workspace=packages/cli

# Web dashboard
npm run ui
```

## 🐛 Issues & Support

- **Bug Reports**: [GitHub Issues](https://github.com/plus-99/cronx/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/plus-99/cronx/discussions)
- **Documentation**: [GitHub Wiki](https://github.com/plus-99/cronx/wiki)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on top of [cron-parser](https://github.com/harrisiirak/cron-parser) for robust cron expression parsing
- Inspired by the simplicity of [node-cron](https://github.com/node-cron/node-cron)
- Dashboard built with [Next.js](https://nextjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- CLI powered by [Commander.js](https://github.com/tj/commander.js/)

---

**Made with ❤️ by the Plus99 team**