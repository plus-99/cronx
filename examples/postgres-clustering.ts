import { Cronx } from '../packages/core/dist/index.js';

async function postgresClusteringExample() {
  const storageUrl = process.env.STORAGE_URL || 'postgresql://cronx:cronx_password@localhost:5432/cronx';
  const workerId = process.env.WORKER_ID || `postgres-cluster-${Math.floor(Math.random() * 1000)}`;

  console.log(`🐘 Starting PostgreSQL cluster worker: ${workerId}`);
  console.log(`📡 Connecting to: ${storageUrl.replace(/:[^:@]*@/, ':****@')}`);

  const cronx = new Cronx({
    storage: storageUrl,
    workerId: workerId,
    metrics: true
  });

  try {
    // Critical job that should only run on one worker at a time
    await cronx.schedule('*/15 * * * * *', async () => {
      console.log(`🔒 [${workerId}] CRITICAL: Starting exclusive backup process...`);
      
      // Simulate critical backup operation
      const backupId = `backup-${Date.now()}`;
      
      // This should take some time to prevent overlapping
      for (let i = 1; i <= 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`   [${workerId}] Backup progress: ${i * 20}% (${backupId})`);
      }
      
      console.log(`✅ [${workerId}] CRITICAL: Backup ${backupId} completed successfully!`);
      
      return {
        backupId,
        workerId,
        tablesBackedUp: ['users', 'orders', 'products', 'analytics'],
        backupSizeGB: (Math.random() * 10 + 5).toFixed(2),
        completedAt: new Date()
      };
    }, {
      name: 'critical-backup-job',
      timeout: 30000,
      retries: 2,
      onSuccess: (result) => {
        console.log(`🎉 [${workerId}] Backup success: ${result.backupId} (${result.backupSizeGB}GB)`);
      },
      onError: (error) => {
        console.log(`🚨 [${workerId}] CRITICAL BACKUP FAILED: ${error.message}`);
      }
    });

    // Worker-specific load balancing job
    await cronx.schedule('*/8 * * * * *', async () => {
      const taskType = ['email_queue', 'image_processing', 'log_analysis', 'cache_warming'][Math.floor(Math.random() * 4)];
      
      console.log(`⚡ [${workerId}] Processing ${taskType}...`);
      
      // Simulate different processing times for different workers
      const processingTime = 200 + Math.random() * 1500;
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      const itemsProcessed = Math.floor(Math.random() * 100) + 20;
      
      return {
        taskType,
        itemsProcessed,
        processingTimeMs: Math.round(processingTime),
        workerId,
        timestamp: new Date()
      };
    }, {
      name: `distributed-task-${workerId}`,
      timeout: 5000,
      retries: 1,
      onSuccess: (result) => {
        console.log(`✅ [${workerId}] ${result.taskType}: ${result.itemsProcessed} items in ${result.processingTimeMs}ms`);
      }
    });

    // Shared monitoring job that can run on any worker
    await cronx.schedule('*/20 * * * * *', async () => {
      console.log(`📊 [${workerId}] Running system health check...`);
      
      // Simulate health check
      const metrics = {
        cpuUsage: (Math.random() * 80 + 10).toFixed(1),
        memoryUsage: (Math.random() * 70 + 20).toFixed(1),
        diskUsage: (Math.random() * 60 + 30).toFixed(1),
        networkLatency: Math.floor(Math.random() * 50) + 5,
        checkedBy: workerId,
        timestamp: new Date()
      };
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simulate alerting on high usage
      if (parseFloat(metrics.cpuUsage) > 75) {
        console.log(`⚠️  [${workerId}] HIGH CPU USAGE: ${metrics.cpuUsage}%`);
      }
      
      return metrics;
    }, {
      name: 'health-monitor',
      timeout: 10000
    });

    // Start the scheduler
    await cronx.start();
    console.log(`🚀 PostgreSQL cluster worker ${workerId} is ready!`);

    // Show cluster information periodically
    setInterval(async () => {
      try {
        console.log(`\n🔍 --- Cluster Worker ${workerId} Status ---`);
        const stats = await cronx.getStats();
        console.log(`Jobs: ${stats.totalJobs} total, ${stats.activeJobs} active`);
        console.log(`Worker: ${stats.workerId} (${stats.isRunning ? '🟢 Running' : '🔴 Stopped'})`);

        // Show recent runs for critical job to demonstrate clustering
        const criticalRuns = await cronx.getJobRuns('critical-backup-job', 3);
        if (criticalRuns.length > 0) {
          console.log(`\n🔒 Recent Critical Backup Runs:`);
          criticalRuns.forEach(run => {
            console.log(`  - ${run.status} at ${run.startTime} (run ID: ${run.id})`);
          });
        }

        // Show distributed task stats
        const distributedStats = await cronx.getJobStats(`distributed-task-${workerId}`);
        if (distributedStats.totalRuns > 0) {
          console.log(`⚡ This worker processed: ${distributedStats.totalRuns} distributed tasks`);
        }

      } catch (error) {
        console.error(`❌ [${workerId}] Error getting cluster status:`, error.message);
      }
    }, 45000);

  } catch (error) {
    console.error(`💥 [${workerId}] Failed to start PostgreSQL clustering example:`, error);
    console.log('💡 Make sure PostgreSQL is running and accessible');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n🔄 Cluster worker ${process.env.WORKER_ID} shutting down gracefully...`);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(`\n🔄 Cluster worker ${process.env.WORKER_ID} received SIGTERM, shutting down...`);
  process.exit(0);
});

postgresClusteringExample().catch(error => {
  console.error('💥 PostgreSQL clustering example failed:', error);
  process.exit(1);
});