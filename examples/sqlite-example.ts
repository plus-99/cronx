import { Cronx } from '../packages/core/dist/index.js';

async function sqliteExample() {
  // Create Cronx instance with SQLite storage for persistence
  const cronx = new Cronx({
    storage: 'sqlite://./cronx-demo.db',
    workerId: 'sqlite-worker-1'
  });

  // Schedule a data processing job
  await cronx.schedule('*/30 * * * * *', async () => {
    const processedItems = Math.floor(Math.random() * 50) + 10;
    console.log(`Processing ${processedItems} items...`);
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { 
      itemsProcessed: processedItems,
      timestamp: new Date(),
      duration: 1000
    };
  }, {
    name: 'data-processor',
    retries: 2,
    backoff: 'fixed'
  });

  // Schedule a cleanup job that runs every 5 minutes
  await cronx.schedule('0 */5 * * * *', async () => {
    console.log('Running cleanup tasks...');
    
    // Simulate cleanup work
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { 
      action: 'cleanup',
      filesRemoved: Math.floor(Math.random() * 10),
      cacheCleared: true
    };
  }, {
    name: 'cleanup-task',
    timeout: 10000 // 10 second timeout
  });

  // Start the scheduler
  await cronx.start();
  console.log('SQLite Cronx started! Database will persist jobs across restarts.');

  // Show upcoming runs
  console.log('\n--- Upcoming Runs ---');
  const upcomingData = cronx.getUpcomingRuns('data-processor', 3);
  console.log('Next data-processor runs:', upcomingData.map(d => d.toISOString()));
  
  const upcomingCleanup = cronx.getUpcomingRuns('cleanup-task', 2);
  console.log('Next cleanup runs:', upcomingCleanup.map(d => d.toISOString()));

  // Manually trigger a job
  setTimeout(async () => {
    console.log('\n--- Manual Job Execution ---');
    try {
      const result = await cronx.runJob('data-processor');
      console.log('Manual execution result:', result);
    } catch (error) {
      console.error('Manual execution failed:', error);
    }
  }, 5000);

  // Show statistics after some time
  setTimeout(async () => {
    console.log('\n--- Final Statistics ---');
    const stats = await cronx.getStats();
    console.log(stats);

    const allJobs = await cronx.listJobs();
    for (const job of allJobs) {
      const runs = await cronx.getJobRuns(job.name, 3);
      console.log(`Job '${job.name}' has ${runs.length} recent runs`);
    }

    await cronx.stop();
    console.log('SQLite Cronx stopped. Data persisted to cronx-demo.db');
    process.exit(0);
  }, 20000);
}

sqliteExample().catch(console.error);