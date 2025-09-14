import { Cronx } from '../packages/core/dist/index.js';

async function postgresBasicExample() {
  // Get storage URL from environment (set by Docker Compose)
  const storageUrl = process.env.STORAGE_URL || 'postgresql://cronx:cronx_password@localhost:5432/cronx';
  const workerId = process.env.WORKER_ID || 'postgres-basic-worker';

  console.log(`🐘 Starting PostgreSQL Cronx worker: ${workerId}`);
  console.log(`📡 Connecting to: ${storageUrl.replace(/:[^:@]*@/, ':****@')}`);

  const cronx = new Cronx({
    storage: storageUrl,
    workerId: workerId,
    metrics: true
  });

  try {
    // Schedule a data processing job
    await cronx.schedule('*/10 * * * * *', async () => {
      const batchId = `batch-${Date.now()}`;
      const recordCount = Math.floor(Math.random() * 500) + 100;
      
      console.log(`📊 [${workerId}] Processing ${recordCount} records in ${batchId}`);
      
      // Simulate data processing with potential failure
      if (Math.random() > 0.9) {
        throw new Error(`Database connection lost while processing ${batchId}`);
      }
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 1000));
      
      return {
        batchId,
        recordsProcessed: recordCount,
        workerId,
        completedAt: new Date(),
        processingTimeMs: Math.floor(Math.random() * 1000) + 200
      };
    }, {
      name: 'data-processor',
      retries: 3,
      backoff: 'exponential',
      timeout: 15000,
      onSuccess: (result) => {
        console.log(`✅ [${workerId}] Processed ${result.recordsProcessed} records in ${result.processingTimeMs}ms`);
      },
      onError: (error) => {
        console.log(`❌ [${workerId}] Data processing failed: ${error.message}`);
      }
    });

    // Schedule a report generation job
    await cronx.schedule('*/30 * * * * *', async () => {
      console.log(`📈 [${workerId}] Generating analytics report...`);
      
      // Simulate report generation
      const reportData = {
        totalUsers: Math.floor(Math.random() * 10000) + 5000,
        activeUsers: Math.floor(Math.random() * 3000) + 1000,
        revenue: (Math.random() * 50000 + 10000).toFixed(2),
        generatedAt: new Date(),
        generatedBy: workerId
      };
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return reportData;
    }, {
      name: 'analytics-report',
      timeout: 10000,
      onSuccess: (result) => {
        console.log(`📊 [${workerId}] Report generated: ${result.totalUsers} users, $${result.revenue} revenue`);
      }
    });

    // Schedule a maintenance job
    await cronx.schedule('*/60 * * * * *', async () => {
      console.log(`🛠️ [${workerId}] Running database maintenance...`);
      
      const maintenanceTasks = [
        'vacuum_tables',
        'update_statistics',
        'cleanup_temp_files',
        'archive_old_logs'
      ];
      
      const completedTasks: string[] = [];
      
      for (const task of maintenanceTasks) {
        // Simulate maintenance task
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        completedTasks.push(task);
        console.log(`  ✓ [${workerId}] Completed: ${task}`);
      }
      
      return {
        completedTasks,
        duration: Math.floor(Math.random() * 2000) + 500,
        workerId,
        timestamp: new Date()
      };
    }, {
      name: 'maintenance-tasks',
      timeout: 20000
    });

    // Start the scheduler
    await cronx.start();
    console.log(`🚀 PostgreSQL Cronx worker ${workerId} started!`);

    // Show statistics periodically
    setInterval(async () => {
      try {
        console.log(`\n📈 --- Worker ${workerId} Statistics ---`);
        const stats = await cronx.getStats();
        console.log(`Total Jobs: ${stats.totalJobs}`);
        console.log(`Active Jobs: ${stats.activeJobs}`);
        console.log(`Worker Status: ${stats.isRunning ? '🟢 Running' : '🔴 Stopped'}`);

        // Show job-specific statistics
        const dataProcessorStats = await cronx.getJobStats('data-processor');
        if (dataProcessorStats.totalRuns > 0) {
          console.log(`Data Processor: ${dataProcessorStats.totalRuns} runs, ${dataProcessorStats.successfulRuns} successful`);
        }

        const reportStats = await cronx.getJobStats('analytics-report');
        if (reportStats.totalRuns > 0) {
          console.log(`Analytics Report: ${reportStats.totalRuns} runs, avg ${Math.round(reportStats.averageDuration)}ms`);
        }
      } catch (error) {
        console.error(`❌ [${workerId}] Error getting statistics:`, error.message);
      }
    }, 30000);

  } catch (error) {
    console.error(`💥 [${workerId}] Failed to start PostgreSQL example:`, error);
    console.log('💡 Make sure PostgreSQL is running and accessible');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n🔄 Worker ${process.env.WORKER_ID} shutting down gracefully...`);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(`\n🔄 Worker ${process.env.WORKER_ID} received SIGTERM, shutting down...`);
  process.exit(0);
});

postgresBasicExample().catch(error => {
  console.error('💥 PostgreSQL basic example failed:', error);
  process.exit(1);
});