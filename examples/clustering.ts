import { Cronx } from '../packages/core/dist/index.js';

async function clusteringExample() {
  const storageUrl = process.env.STORAGE_URL || 'sqlite://./cluster-demo.db';
  const workerId = process.env.WORKER_ID || `worker-${Math.floor(Math.random() * 1000)}`;
  
  console.log(`Starting worker: ${workerId}`);
  console.log(`📡 Connecting to: ${storageUrl.replace(/:[^:@]*@/, ':****@')}`);
  
  // Use storage from environment (SQLite, Postgres, or Redis)
  const cronx = new Cronx({
    storage: storageUrl,
    workerId: workerId
  });

  // Start the scheduler FIRST
  await cronx.start();

  // Job that should only run on one worker at a time
  await cronx.schedule('*/10 * * * * *', async () => {
    console.log(`[${workerId}] Critical job starting...`);
    
    // Simulate work that should not run concurrently
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log(`[${workerId}] Critical job completed!`);
    return {
      workerId,
      timestamp: new Date(),
      message: 'Exclusive work completed'
    };
  }, {
    name: 'critical-singleton-job',
    timeout: 15000
  });

  // Job that can run on multiple workers
  await cronx.schedule('*/5 * * * * *', async () => {
    console.log(`[${workerId}] Worker-specific task running...`);
    return {
      workerId,
      randomValue: Math.random(),
      timestamp: new Date()
    };
  }, {
    name: `worker-task-${workerId}`,
    retries: 1
  });
  console.log(`Worker ${workerId} started!`);
  
  // Show worker info
  setTimeout(async () => {
    const stats = await cronx.getStats();
    console.log(`[${workerId}] Stats:`, stats);
    
    // Show recent runs for the critical job
    const criticalRuns = await cronx.getJobRuns('critical-singleton-job', 5);
    console.log(`[${workerId}] Critical job runs seen:`, criticalRuns.length);
    criticalRuns.forEach(run => {
      console.log(`  - Run ${run.id}: ${run.status} (attempt ${run.attempt})`);
    });
  }, 12000);

  // Cleanup after demo
  setTimeout(async () => {
    await cronx.stop();
    console.log(`Worker ${workerId} stopped.`);
    process.exit(0);
  }, 30000);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\nShutting down worker gracefully...');
  process.exit(0);
});

clusteringExample().catch(console.error);