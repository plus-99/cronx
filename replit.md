# Overview

Cronx is a reliable, distributed-ready cron job scheduler for Node.js designed as a drop-in replacement for node-cron. It provides persistent job storage, clustering support, and comprehensive observability features. The monorepo architecture includes a core library and CLI tool for managing scheduled jobs across multiple workers.

## Current Status

The project is fully implemented and functional with:
- ✅ Core scheduling engine with cron parsing (supports seconds precision)
- ✅ Multiple storage adapters: Memory, SQLite, PostgreSQL, Redis
- ✅ Job executor with retry mechanisms and distributed locking
- ✅ CLI tool for job management
- ✅ Web dashboard with real-time monitoring and job management
- ✅ Working examples demonstrating all features including Redis scenarios
- ✅ TypeScript support with full type definitions

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Monorepo Structure
The project uses npm workspaces with a packages-based monorepo architecture:
- `packages/core` - Main cronx library with scheduler, executor, and storage adapters
- `packages/cli` - Command-line interface for job management
- `packages/ui` - Next.js web dashboard for real-time monitoring and job management
- Root-level examples and runner scripts for demonstration

## Core Components

### Scheduler Engine
Built on top of `cron-parser` for robust cron expression parsing with seconds precision support. The scheduler maintains job timers and handles automatic rescheduling based on cron expressions.

### Job Executor
Implements reliable job execution with:
- Configurable retry mechanisms (fixed/exponential backoff)
- Timeout handling with job cancellation
- Error capture and result persistence
- Distributed locking to prevent concurrent execution

### Storage Layer
Pluggable storage architecture supporting multiple backends:
- **Memory** - In-memory storage for development/testing
- **SQLite** - Local file-based persistence with better-sqlite3
- **PostgreSQL** - Production database with clustering support
- **Redis** - High-performance distributed storage

Each adapter implements the same interface for jobs, job runs, and distributed locking.

## Clustering and Distributed Execution

### Worker Identification
Each Cronx instance has a unique worker ID for tracking job ownership and preventing duplicate execution across multiple processes.

### Distributed Locking
Jobs use time-based locks with TTL to ensure only one worker executes a job at any given time. Lock extension prevents job interruption during long-running tasks.

### Job Persistence
All job definitions and execution history are persisted, enabling:
- Recovery after process restarts
- Audit trails and execution history
- Cross-worker job visibility

## Error Handling and Reliability

### Retry Strategies
- Fixed backoff - Consistent delay between retries
- Exponential backoff - Increasing delays with configurable limits
- Configurable retry counts per job

### Job Isolation
Each job execution runs in isolation with timeout protection to prevent hanging processes and resource leaks.

### Observability
Built-in logging interface with structured metadata for monitoring job execution, failures, and performance metrics.

# External Dependencies

## Core Runtime Dependencies
- **cron-parser** - Cron expression parsing and next run calculation
- **better-sqlite3** - High-performance SQLite database adapter
- **pg** - PostgreSQL database client for production deployments
- **redis** - Redis client for distributed caching and locking
- **prom-client** - Prometheus metrics collection (referenced in design)

## CLI Dependencies
- **commander** - Command-line argument parsing and subcommand routing
- **chalk** - Terminal color output for enhanced user experience

## Development Tools
- **tsx** - TypeScript execution for examples and development
- **typescript** - TypeScript compiler and type checking
- **@types/node** - Node.js type definitions for TypeScript development

## Database Support
The storage layer requires one of the following based on configuration:
- SQLite (via better-sqlite3) for local/single-instance deployments
- PostgreSQL (via pg) for distributed/production environments
- Redis for high-performance distributed scenarios
- No external dependencies for memory storage mode