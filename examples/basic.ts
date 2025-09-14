import { Cronx } from '../packages/core/src/index.js';

async function basicExample() {
  const workerId = process.env.WORKER_ID || 'basic-example';
  
  console.log(`🚀 Starting Basic Cronx worker: ${workerId}`);
  
  // Create Cronx instance with in-memory storage
  const cronx = new Cronx({
    storage: 'memory://',
    workerId: workerId
  });

  // Schedule a simple job that runs every 5 seconds
  await cronx.schedule('*/5 * * * * *', async () => {
    console.log('Heartbeat job executed at', new Date().toISOString());
    return { status: 'ok', timestamp: new Date() };
  }, { 
    name: 'heartbeat',
    timeout: 5000 // 5 second timeout
  });

  // Schedule a job with retries (every 10 seconds)
  await cronx.schedule('*/10 * * * * *', async () => {
    // Simulate random failure
    if (Math.random() > 0.6) {
      throw new Error('Random failure occurred');
    }
    console.log('Reliable job completed successfully');
    return { processed: Math.floor(Math.random() * 100) };
  }, {
    name: 'reliable-job',
    retries: 3,
    backoff: 'exponential',
    onSuccess: (result) => {
      console.log('Job succeeded with result:', result);
    },
    onError: (error) => {
      console.log('Job failed with error:', error.message);
    }
  });

  // Start the scheduler
  await cronx.start();
  console.log('Cronx started! Jobs will run according to their schedules.');

  // Let it run for a longer demo period to see multiple executions
  setTimeout(async () => {
    console.log('\n--- Cronx Statistics ---');
    const stats = await cronx.getStats();
    console.log('Total Jobs:', stats.totalJobs);
    console.log('Active Jobs:', stats.activeJobs);
    console.log('Worker ID:', stats.workerId);
    console.log('Is Running:', stats.isRunning);

    console.log('\n--- Job Run History ---');
    const heartbeatRuns = await cronx.getJobRuns('heartbeat', 5);
    console.log('Recent heartbeat runs:', heartbeatRuns.length);
    
    const reliableRuns = await cronx.getJobRuns('reliable-job', 5);
    console.log('Recent reliable-job runs:', reliableRuns.length);

    // Stop after demo
    await cronx.stop();
    console.log('Cronx stopped.');
    process.exit(0);
  }, 30000); // Run for 30 seconds
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

basicExample().catch(console.error);