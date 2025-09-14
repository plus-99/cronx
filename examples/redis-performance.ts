import { Cronx } from '../packages/core/dist/index.js';

async function redisPerformanceExample() {
  const storageUrl = process.env.STORAGE_URL || 'redis://localhost:6379';
  const workerId = process.env.WORKER_ID || 'performance-worker';
  
  console.log('⚡ Redis Performance Demonstration');
  console.log(`📡 Connecting to: ${storageUrl.replace(/:[^:@]*@/, ':****@')}`);
  console.log(`🏃 Worker ID: ${workerId}`);
  console.log('This example showcases high-throughput job scheduling with Redis\n');

  const cronx = new Cronx({
    storage: storageUrl,
    workerId: workerId,
    metrics: true
  });

  try {
    // High-frequency micro-tasks
    await cronx.schedule('*/1 * * * * *', async () => {
      const taskId = Math.random().toString(36).substring(7);
      const startTime = process.hrtime.bigint();
      
      // Simulate very fast processing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      
      return {
        taskId,
        type: 'micro-task',
        duration,
        timestamp: Date.now()
      };
    }, {
      name: 'micro-task',
      timeout: 500,
      onSuccess: (result: any) => {
        if (result.duration > 30) {
          console.log(`🔍 Micro-task ${result.taskId} took ${result.duration.toFixed(2)}ms`);
        }
      }
    });

    // Batch processing simulation
    await cronx.schedule('*/5 * * * * *', async () => {
      const batchId = `batch-${Date.now()}`;
      const itemCount = Math.floor(Math.random() * 1000) + 500;
      
      console.log(`📦 Processing batch ${batchId} with ${itemCount} items`);
      
      // Simulate batch processing with Redis-like performance
      const startTime = Date.now();
      const processingTime = Math.max(100, itemCount * 0.1); // Simulate O(n) processing
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      const duration = Date.now() - startTime;
      const throughput = Math.round(itemCount / (duration / 1000)); // items per second
      
      console.log(`✅ Batch ${batchId} completed: ${itemCount} items in ${duration}ms (${throughput} items/sec)`);
      
      return {
        batchId,
        itemCount,
        duration,
        throughput,
        type: 'batch-processing'
      };
    }, {
      name: 'batch-processor',
      timeout: 10000,
      retries: 1
    });

    // Concurrent worker simulation
    const concurrentJobs: Promise<void>[] = [];
    for (let i = 1; i <= 3; i++) {
      const jobName = `concurrent-worker-${i}`;
      concurrentJobs.push(
        cronx.schedule('*/3 * * * * *', async () => {
          const workerId = i;
          const startTime = Date.now();
          
          // Simulate concurrent work with slight random delay
          const workDuration = 200 + Math.random() * 300;
          await new Promise(resolve => setTimeout(resolve, workDuration));
          
          return {
            workerId,
            duration: Date.now() - startTime,
            processed: Math.floor(Math.random() * 100),
            type: 'concurrent-work'
          };
        }, {
          name: jobName,
          timeout: 2000,
          onSuccess: (result) => {
            console.log(`⚙️  Worker-${result.workerId} processed ${result.processed} items in ${result.duration}ms`);
          }
        })
      );
    }

    await Promise.all(concurrentJobs);

    // Memory usage tracking job
    await cronx.schedule('*/10 * * * * *', async () => {
      const memUsage = process.memoryUsage();
      
      return {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        timestamp: new Date()
      };
    }, {
      name: 'memory-monitor',
      timeout: 1000,
      onSuccess: (result) => {
        console.log(`💾 Memory: RSS ${result.rss}MB, Heap ${result.heapUsed}/${result.heapTotal}MB`);
      }
    });

    await cronx.start();
    console.log('🚀 Performance test started with Redis storage\n');

    // Performance monitoring and statistics
    let executionCount = 0;
    let totalDuration = 0;
    
    const performanceMonitor = setInterval(async () => {
      try {
        const stats = await cronx.getStats();
        const overallStats = await cronx.getJobStats();
        
        console.log(`\n📈 --- Performance Metrics (${new Date().toLocaleTimeString()}) ---`);
        console.log(`Active Jobs: ${stats.activeJobs} | Total Executions: ${overallStats.totalRuns}`);
        console.log(`Success Rate: ${overallStats.totalRuns > 0 ? ((overallStats.successfulRuns / overallStats.totalRuns) * 100).toFixed(1) : 0}%`);
        console.log(`Avg Duration: ${overallStats.averageDuration.toFixed(2)}ms`);
        
        // Get batch processing stats
        const batchStats = await cronx.getJobStats('batch-processor');
        if (batchStats.totalRuns > 0) {
          console.log(`Batch Processing: ${batchStats.totalRuns} batches, avg ${batchStats.averageDuration.toFixed(0)}ms`);
        }

        // Show recent job execution frequency
        const recentMicroTasks = await cronx.getJobRuns('micro-task', 10);
        console.log(`Recent micro-tasks: ${recentMicroTasks.length} executions`);
        
      } catch (error) {
        console.log('📊 Monitoring temporarily unavailable');
      }
    }, 15000);

    // Demonstrate performance under load
    setTimeout(async () => {
      console.log('\n🔥 Demonstrating pause/resume during high load...');
      
      // Pause some jobs to show performance impact
      await cronx.pauseJob('micro-task');
      console.log('⏸️  Paused micro-tasks to reduce load');
      
      setTimeout(async () => {
        await cronx.resumeJob('micro-task');
        console.log('▶️  Resumed micro-tasks - load restored');
      }, 8000);
      
    }, 20000);

    // Final performance summary
    setTimeout(async () => {
      clearInterval(performanceMonitor);
      
      console.log('\n📊 --- Final Performance Summary ---');
      
      const finalStats = await cronx.getJobStats();
      const uptime = 45; // seconds
      
      console.log(`Total Executions: ${finalStats.totalRuns}`);
      console.log(`Executions per second: ${(finalStats.totalRuns / uptime).toFixed(2)}`);
      console.log(`Success Rate: ${((finalStats.successfulRuns / finalStats.totalRuns) * 100).toFixed(1)}%`);
      console.log(`Average Execution Time: ${finalStats.averageDuration.toFixed(2)}ms`);
      
      // Show job-specific performance
      const microTaskStats = await cronx.getJobStats('micro-task');
      console.log(`\nMicro-task Performance:`);
      console.log(`  Executions: ${microTaskStats.totalRuns}`);
      console.log(`  Avg Duration: ${microTaskStats.averageDuration.toFixed(2)}ms`);
      
      const batchStats = await cronx.getJobStats('batch-processor');
      console.log(`\nBatch Processing Performance:`);
      console.log(`  Batches: ${batchStats.totalRuns}`);
      console.log(`  Avg Duration: ${batchStats.averageDuration.toFixed(0)}ms`);

      await cronx.stop();
      console.log('\n🏁 Performance demonstration completed!');
      
      process.exit(0);
    }, 45000);

  } catch (error) {
    console.error('❌ Failed to start Redis performance example:', error);
    console.log('💡 Make sure Redis is running on localhost:6379');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down performance test...');
  process.exit(0);
});

redisPerformanceExample().catch(error => {
  console.error('💥 Redis performance example failed:', error);
  process.exit(1);
});