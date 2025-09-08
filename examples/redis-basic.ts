import { Cronx } from '../packages/core/dist/index.js';

async function redisBasicExample() {
  // Create Cronx instance with Redis storage
  const cronx = new Cronx({
    storage: 'redis://localhost:6379',
    workerId: 'redis-basic-worker',
    metrics: true // Enable Prometheus metrics
  });

  console.log('🔗 Connecting to Redis...');

  try {
    // Schedule a high-frequency job to demonstrate Redis performance
    await cronx.schedule('*/5 * * * * *', async () => {
      const timestamp = new Date().toISOString();
      console.log(`⚡ High-frequency job executed at ${timestamp}`);
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { 
        executedAt: timestamp, 
        workerId: 'redis-basic-worker',
        taskType: 'high-frequency'
      };
    }, { 
      name: 'high-frequency-task',
      timeout: 2000,
      onSuccess: (result) => {
        console.log('✅ High-frequency task completed:', result.executedAt);
      }
    });

    // Schedule a data processing job
    await cronx.schedule('*/15 * * * * *', async () => {
      const batchSize = Math.floor(Math.random() * 1000) + 500;
      console.log(`📊 Processing batch of ${batchSize} records...`);
      
      // Simulate data processing with potential failure
      if (Math.random() > 0.8) {
        throw new Error(`Processing failed for batch size ${batchSize}`);
      }
      
      return { 
        processed: batchSize, 
        status: 'completed',
        timestamp: new Date()
      };
    }, {
      name: 'data-processor',
      retries: 2,
      backoff: 'exponential',
      timeout: 10000,
      onSuccess: (result) => {
        console.log(`✅ Processed ${result.processed} records successfully`);
      },
      onError: (error) => {
        console.log(`❌ Data processing failed: ${error.message}`);
      }
    });

    // Schedule a cleanup job
    await cronx.schedule('*/30 * * * * *', async () => {
      console.log('🧹 Running cleanup tasks...');
      
      // Simulate cleanup operations
      const itemsDeleted = Math.floor(Math.random() * 50);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return { 
        operation: 'cleanup',
        itemsDeleted,
        completedAt: new Date()
      };
    }, {
      name: 'cleanup-task',
      timeout: 5000
    });

    // Start the scheduler
    await cronx.start();
    console.log('🚀 Redis Cronx started! Jobs are running with Redis persistence.');

    // Demonstrate job management after some runtime
    setTimeout(async () => {
      console.log('\n📈 --- Redis Cronx Statistics ---');
      const stats = await cronx.getStats();
      console.log(`Total Jobs: ${stats.totalJobs}`);
      console.log(`Active Jobs: ${stats.activeJobs}`);
      console.log(`Paused Jobs: ${stats.pausedJobs}`);
      console.log(`Worker ID: ${stats.workerId}`);
      console.log(`Status: ${stats.isRunning ? 'Running' : 'Stopped'}`);

      // Show job-specific statistics
      console.log('\n📊 --- Job Statistics ---');
      const dataProcessorStats = await cronx.getJobStats('data-processor');
      console.log('Data Processor Stats:', {
        totalRuns: dataProcessorStats.totalRuns,
        successfulRuns: dataProcessorStats.successfulRuns,
        failedRuns: dataProcessorStats.failedRuns,
        averageDuration: Math.round(dataProcessorStats.averageDuration) + 'ms'
      });

      // Demonstrate pause/resume functionality
      console.log('\n⏸️  Pausing high-frequency task...');
      await cronx.pauseJob('high-frequency-task');
      
      setTimeout(async () => {
        console.log('▶️  Resuming high-frequency task...');
        await cronx.resumeJob('high-frequency-task');
        
        setTimeout(async () => {
          // Show final metrics
          console.log('\n📋 --- Final Job Run History ---');
          const highFreqRuns = await cronx.getJobRuns('high-frequency-task', 5);
          console.log(`Recent high-frequency runs: ${highFreqRuns.length}`);
          
          const dataRuns = await cronx.getJobRuns('data-processor', 3);
          console.log(`Recent data-processor runs: ${dataRuns.length}`);

          // Show Prometheus metrics if enabled
          const metrics = await cronx.getMetrics();
          if (metrics) {
            console.log('\n📈 Prometheus Metrics Available');
            console.log('Metrics endpoint would show:', metrics.split('\n').length, 'lines of metrics');
          }

          // Cleanup and exit
          await cronx.stop();
          console.log('🛑 Redis Cronx stopped.');
          process.exit(0);
        }, 8000);
      }, 5000);
    }, 15000);

  } catch (error) {
    console.error('❌ Failed to start Redis example:', error);
    console.log('💡 Make sure Redis is running on localhost:6379');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Received SIGTERM, shutting down...');
  process.exit(0);
});

redisBasicExample().catch(error => {
  console.error('💥 Redis basic example failed:', error);
  process.exit(1);
});