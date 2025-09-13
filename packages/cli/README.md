# @plus99/cronx-cli

Command-line interface for managing Cronx cron jobs.

## Installation

### Global Installation
```bash
npm install -g @plus99/cronx-cli
```

### Local Installation
```bash
npm install @plus99/cronx-cli
npx cronx --help
```

## Usage

The CLI connects to a running Cronx instance via storage backend to manage and monitor jobs.

### Basic Commands

```bash
# Show help
cronx --help

# List all jobs
cronx list

# Show job statistics
cronx stats [job-name]

# Run a job immediately
cronx run <job-name>

# Show job execution history
cronx history <job-name> [--limit 10]
```

## Configuration

The CLI uses environment variables or command-line options to connect to your Cronx storage:

### Environment Variables

```bash
# PostgreSQL
export CRONX_STORAGE_URL="postgresql://user:password@localhost:5432/cronx"

# Redis
export CRONX_STORAGE_URL="redis://localhost:6379"

# SQLite
export CRONX_STORAGE_URL="sqlite://./jobs.db"
```

### Command-Line Options

```bash
# Specify storage URL
cronx list --storage "postgresql://localhost:5432/cronx"

# Set worker ID
cronx list --worker-id "cli-worker"

# Enable verbose output
cronx list --verbose
```

## Commands Reference

### `cronx list`

Display all scheduled jobs with their current status.

```bash
cronx list
cronx list --format table
cronx list --format json
```

**Output:**
```
┌─────────────┬─────────────────┬────────┬─────────────────────┬─────────────────────┐
│ Name        │ Schedule        │ Status │ Next Run            │ Last Run            │
├─────────────┼─────────────────┼────────┼─────────────────────┼─────────────────────┤
│ heartbeat   │ */1 * * * *     │ Active │ 2024-01-15 10:31:00 │ 2024-01-15 10:30:00 │
│ cleanup     │ 0 2 * * *       │ Paused │ -                   │ 2024-01-15 02:00:00 │
│ report      │ 0 9 * * 1       │ Active │ 2024-01-22 09:00:00 │ 2024-01-15 09:00:00 │
└─────────────┴─────────────────┴────────┴─────────────────────┴─────────────────────┘
```

### `cronx stats [job-name]`

Show execution statistics for all jobs or a specific job.

```bash
# All jobs
cronx stats

# Specific job
cronx stats my-job
```

**Output:**
```
Overall Statistics:
  Total Jobs: 5
  Active Jobs: 3
  Paused Jobs: 2
  Worker ID: my-worker
  Status: Running

Job Statistics (my-job):
  Total Runs: 150
  Successful: 145 (96.7%)
  Failed: 5 (3.3%)
  Average Duration: 1.2s
  Last Run: 2024-01-15 10:30:00
  Next Run: 2024-01-15 10:31:00
```

### `cronx run <job-name>`

Execute a job immediately, outside its normal schedule.

```bash
cronx run my-job
cronx run my-job --wait  # Wait for completion
```

**Output:**
```
✓ Job 'my-job' executed successfully
  Duration: 1.23s
  Result: {"status":"success","processed":42}
```

### `cronx history <job-name>`

Show recent execution history for a job.

```bash
cronx history my-job
cronx history my-job --limit 20
cronx history my-job --format json
```

**Output:**
```
Recent executions for 'my-job':

┌─────────────────────┬─────────────┬──────────┬─────────────────┐
│ Started At          │ Duration    │ Status   │ Result          │
├─────────────────────┼─────────────┼──────────┼─────────────────┤
│ 2024-01-15 10:30:00 │ 1.2s        │ Success  │ {"status":"ok"} │
│ 2024-01-15 10:29:00 │ 0.8s        │ Success  │ {"status":"ok"} │
│ 2024-01-15 10:28:00 │ 2.1s        │ Failed   │ Timeout error   │
│ 2024-01-15 10:27:00 │ 1.5s        │ Success  │ {"status":"ok"} │
└─────────────────────┴─────────────┴──────────┴─────────────────┘
```

## Output Formats

The CLI supports multiple output formats for different use cases:

### Table Format (Default)
```bash
cronx list --format table
```

### JSON Format
```bash
cronx list --format json
```

### CSV Format
```bash
cronx list --format csv
```

## Examples

### Monitor Job Performance
```bash
# Check overall system health
cronx stats

# Monitor a specific critical job
cronx stats payment-processor

# Check recent failures
cronx history payment-processor --limit 50 | grep Failed
```

### Troubleshooting
```bash
# List all jobs to see current status
cronx list

# Check if a job is running properly
cronx stats problematic-job

# Review recent execution history
cronx history problematic-job --limit 20

# Run a job manually to test
cronx run problematic-job --wait
```

### Integration with Scripts
```bash
#!/bin/bash

# Get job status in JSON format for processing
STATUS=$(cronx stats my-job --format json)

# Check if job failed recently
RECENT_FAILURES=$(cronx history my-job --limit 10 --format json | jq '[.[] | select(.status == "failed")] | length')

if [ "$RECENT_FAILURES" -gt 2 ]; then
  echo "Alert: Job has failed $RECENT_FAILURES times recently"
  # Send alert...
fi
```

### Monitoring Multiple Environments
```bash
# Production
CRONX_STORAGE_URL="postgresql://prod-db:5432/cronx" cronx stats

# Staging  
CRONX_STORAGE_URL="postgresql://staging-db:5432/cronx" cronx stats

# Development
CRONX_STORAGE_URL="sqlite://./dev-jobs.db" cronx stats
```

## Environment Configuration

Create a `.env` file or set environment variables:

```bash
# Storage connection
CRONX_STORAGE_URL=postgresql://localhost:5432/cronx

# Worker identification
CRONX_WORKER_ID=cli-worker

# Output preferences
CRONX_DEFAULT_FORMAT=table
CRONX_TIMEZONE=America/New_York
```

## Error Handling

The CLI provides clear error messages and appropriate exit codes:

```bash
# Success
cronx list
echo $?  # 0

# Connection error
cronx list --storage "postgresql://invalid:5432/db"
echo $?  # 1

# Job not found
cronx run nonexistent-job
echo $?  # 1
```

Common error scenarios:
- **Connection failed**: Check storage URL and network connectivity
- **Job not found**: Verify job name with `cronx list`
- **Permission denied**: Ensure proper database/Redis permissions
- **Invalid format**: Check command syntax with `--help`

## License

MIT License - see LICENSE file for details.