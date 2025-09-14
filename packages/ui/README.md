# @plus99/cronx-ui

Web-based dashboard for managing and monitoring Cronx cron jobs.

## Features

- 📊 **Real-time Dashboard** - Live monitoring of job statistics and execution status
- ⚙️ **Job Management** - Create, pause, resume, and delete jobs through web interface
- 📈 **Performance Metrics** - Visual display of success rates, execution times, and system health
- 🔄 **Auto-refresh** - Dashboard automatically updates every 10 seconds
- 🎯 **Job Creation** - Web form for scheduling new cron jobs (development only)
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🔒 **Production Safe** - Security controls prevent unsafe operations in production

## Installation

The UI package is included in the Cronx monorepo and can be run as part of your project.

### Prerequisites

- Node.js 18+
- A running Cronx instance with supported storage backend

### Setup

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/plus-99/cronx.git
cd cronx
npm install
```

2. Start the UI development server:
```bash
npm run ui
```

3. Open your browser to `http://localhost:5050`

## Configuration

### Environment Variables

Configure the UI by setting environment variables:

```bash
# Storage backend (connects to your Cronx instance)
CRONX_STORAGE_URL=postgresql://localhost:5432/cronx
# or
CRONX_STORAGE_URL=redis://localhost:6379
# or
CRONX_STORAGE_URL=sqlite://./jobs.db

# Node environment
NODE_ENV=development  # Enables job creation form
NODE_ENV=production   # Disables dynamic job creation for security
```

### Production Deployment

For production deployment:

```bash
# Build the application
npm run ui:build

# Start in production mode
cd packages/ui
npm run start
```

## Dashboard Features

### Overview Page

The main dashboard provides:

- **System Status** - Shows if Cronx is running and worker information
- **Job Statistics** - Total jobs, active/paused counts, execution metrics
- **Success Rate** - Percentage of successful job executions
- **Average Duration** - Mean execution time across all jobs
- **Job List** - Real-time view of all scheduled jobs with controls

### Job Management

Each job in the list shows:
- Job name and schedule
- Current status (Active/Paused)
- Next and last execution times
- Retry configuration and timeout settings
- Action buttons for control

**Available Actions:**
- **Run Now** - Execute job immediately
- **Pause/Resume** - Toggle job execution
- **Delete** - Remove job permanently (with confirmation)

### Job Creation (Development Only)

In development mode, you can create new jobs through the web form:

- **Job Name** - Unique identifier
- **Cron Schedule** - Standard or extended cron expression
- **Job Function** - JavaScript function to execute
- **Retry Policy** - Number of retries and backoff strategy
- **Timeout** - Maximum execution time

**Example Job Function:**
```javascript
async () => {
  console.log('Hello from Cronx!');

  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    status: 'success',
    timestamp: new Date(),
    processed: Math.floor(Math.random() * 100)
  };
}
```

## API Endpoints

The UI provides REST API endpoints for integration:

### Statistics
```bash
GET /api/stats
```
Returns overall system statistics and metrics.

### Jobs
```bash
GET /api/jobs              # List all jobs
POST /api/jobs             # Create new job (dev only)
GET /api/jobs/:name        # Get job details
DELETE /api/jobs/:name     # Delete job
```

### Job Control
```bash
POST /api/jobs/:name/pause   # Pause job
POST /api/jobs/:name/resume  # Resume job
POST /api/jobs/:name/run     # Run job now
```

### Metrics
```bash
GET /api/metrics
```
Returns Prometheus metrics in text format.

## Development

### Local Development

1. Start the core Cronx instance with some example jobs:
```bash
npm run example:basic
```

2. In another terminal, start the UI:
```bash
npm run ui
```

3. Open `http://localhost:5050` to see the dashboard

### Building for Production

```bash
# Build all packages including UI
npm run build

# Or build UI specifically
npm run ui:build
```

### Project Structure

```
packages/ui/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── api/            # API route handlers
│   │   ├── jobs/           # Job management pages
│   │   └── page.tsx        # Dashboard home page
│   ├── components/         # React components
│   │   ├── ui/            # Base UI components
│   │   └── dashboard/     # Dashboard-specific components
│   ├── lib/               # Utility functions
│   └── types/             # TypeScript type definitions
├── next.config.js         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── package.json
```

## Security Considerations

### Production Safety

- **Dynamic Job Creation**: Disabled in production to prevent code injection
- **Input Validation**: All API endpoints validate inputs
- **Error Handling**: Graceful error handling without exposing internals

### Development Features

- **Job Creation Form**: Only available when `NODE_ENV=development`
- **Code Execution**: Uses `new Function()` for job creation (development only)
- **Hot Reload**: Full Next.js development experience

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Common Issues

**Dashboard shows "Disconnected"**
- Check that Cronx core instance is running
- Verify `CRONX_STORAGE_URL` environment variable
- Ensure storage backend (PostgreSQL/Redis/SQLite) is accessible

**Jobs not appearing in list**
- Confirm jobs are scheduled in the connected Cronx instance
- Check browser console for API errors
- Verify storage backend connectivity

**Job creation disabled**
- Ensure `NODE_ENV=development` for job creation features
- In production, use the core library or CLI to create jobs

**Page not loading**
- Verify Node.js 18+ is installed
- Check that port 5000 is available
- Review terminal output for build errors

### Debug Mode

Enable verbose logging:

```bash
DEBUG=cronx:* npm run ui
```

## Performance

### Optimization

- Dashboard auto-refreshes every 10 seconds by default
- API responses are cached when appropriate
- Large job lists are paginated
- Minimal JavaScript bundle size with code splitting

### Scaling

For high job volumes:
- Consider increasing refresh intervals
- Use pagination for job lists
- Monitor API response times
- Scale storage backend appropriately

## License

MIT License - see LICENSE file for details.