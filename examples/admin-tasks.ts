import { Cronx } from '../packages/core/dist/index.js';

async function adminTasksExample() {
  const storageUrl = process.env.STORAGE_URL || 'postgresql://cronx:cronx_password@localhost:5432/cronx';
  const workerId = process.env.WORKER_ID || 'admin-worker';

  console.log(`👑 Starting Admin Worker: ${workerId}`);
  console.log(`📡 Connecting to: ${storageUrl.replace(/:[^:@]*@/, ':****@')}`);

  const cronx = new Cronx({
    storage: storageUrl,
    workerId: workerId,
    metrics: true
  });

  try {
    // Database cleanup job - runs daily
    await cronx.schedule('0 0 2 * * *', async () => {
      console.log(`🧹 [${workerId}] Starting daily database cleanup...`);
      
      const cleanup: { [key: string]: number } = {
        oldJobRuns: Math.floor(Math.random() * 1000) + 500,
        expiredSessions: Math.floor(Math.random() * 200) + 50,
        tempFiles: Math.floor(Math.random() * 50) + 10,
        logEntries: Math.floor(Math.random() * 5000) + 2000
      };
      
      // Simulate cleanup operations
      for (const [operation, count] of Object.entries(cleanup)) {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`  ✓ [${workerId}] Cleaned ${count} ${operation}`);
      }
      
      return {
        ...cleanup,
        totalItemsDeleted: Object.values(cleanup).reduce((a, b) => a + b, 0),
        completedAt: new Date(),
        adminWorker: workerId
      };
    }, {
      name: 'daily-database-cleanup',
      timeout: 300000, // 5 minutes
      onSuccess: (result) => {
        console.log(`🎯 [${workerId}] Cleanup completed: ${result.totalItemsDeleted} items removed`);
      }
    });

    // System monitoring and alerting
    await cronx.schedule('*/30 * * * * *', async () => {
      console.log(`📊 [${workerId}] Running system diagnostics...`);
      
      // Simulate system checks
      const checks = {
        diskSpace: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        cpuLoad: Math.random() * 100,
        dbConnections: Math.floor(Math.random() * 50) + 10,
        activeJobs: Math.floor(Math.random() * 20) + 5
      };
      
      const alerts: string[] = [];
      
      // Check thresholds
      if (checks.diskSpace > 85) alerts.push(`High disk usage: ${checks.diskSpace.toFixed(1)}%`);
      if (checks.memoryUsage > 90) alerts.push(`High memory usage: ${checks.memoryUsage.toFixed(1)}%`);
      if (checks.cpuLoad > 80) alerts.push(`High CPU load: ${checks.cpuLoad.toFixed(1)}%`);
      if (checks.dbConnections > 40) alerts.push(`High DB connections: ${checks.dbConnections}`);
      
      if (alerts.length > 0) {
        console.log(`🚨 [${workerId}] ALERTS:`, alerts.join(', '));
      }
      
      return {
        systemChecks: checks,
        alerts,
        checkedAt: new Date(),
        alertLevel: alerts.length > 0 ? 'WARNING' : 'OK'
      };
    }, {
      name: 'system-monitoring',
      timeout: 15000
    });

    // Performance optimization job
    await cronx.schedule('0 0 */6 * * *', async () => {
      console.log(`⚡ [${workerId}] Running performance optimization...`);
      
      const optimizations = [
        'analyze_query_performance',
        'update_table_statistics',
        'optimize_indexes',
        'cache_preload',
        'connection_pool_tuning'
      ];
      
      const results: Array<{operation: string, improvementPercent: number}> = [];
      
      for (const optimization of optimizations) {
        await new Promise(resolve => setTimeout(resolve, 800));
        const improvement = (Math.random() * 20 + 5).toFixed(1);
        results.push({
          operation: optimization,
          improvementPercent: parseFloat(improvement)
        });
        console.log(`  ⚡ [${workerId}] ${optimization}: ${improvement}% improvement`);
      }
      
      return {
        optimizations: results,
        totalImprovementPercent: results.reduce((sum, r) => sum + r.improvementPercent, 0).toFixed(1),
        completedAt: new Date()
      };
    }, {
      name: 'performance-optimization',
      timeout: 600000, // 10 minutes
      retries: 1
    });

    // Backup verification job
    await cronx.schedule('0 30 1 * * *', async () => {
      console.log(`🔍 [${workerId}] Verifying backup integrity...`);
      
      const backupChecks = {
        databaseBackup: Math.random() > 0.1,
        configBackup: Math.random() > 0.05,
        logBackup: Math.random() > 0.02,
        staticFilesBackup: Math.random() > 0.03
      };
      
      const failedChecks = Object.entries(backupChecks)
        .filter(([_, status]) => !status)
        .map(([name, _]) => name);
      
      if (failedChecks.length > 0) {
        console.log(`🚨 [${workerId}] BACKUP VERIFICATION FAILED: ${failedChecks.join(', ')}`);
        throw new Error(`Backup verification failed for: ${failedChecks.join(', ')}`);
      }
      
      console.log(`✅ [${workerId}] All backups verified successfully`);
      
      return {
        backupChecks,
        allBackupsValid: failedChecks.length === 0,
        verifiedAt: new Date()
      };
    }, {
      name: 'backup-verification',
      timeout: 180000, // 3 minutes
      retries: 2,
      backoff: 'exponential',
      onError: (error) => {
        console.log(`🚨 [${workerId}] CRITICAL: Backup verification failed - ${error.message}`);
      }
    });

    // Start the admin scheduler
    await cronx.start();
    console.log(`👑 Admin worker ${workerId} is monitoring the system!`);

    // Admin dashboard update
    setInterval(async () => {
      try {
        console.log(`\n👑 --- Admin Dashboard (${workerId}) ---`);
        const stats = await cronx.getStats();
        console.log(`System Status: ${stats.isRunning ? '🟢 Operational' : '🔴 Down'}`);
        console.log(`Total Admin Jobs: ${stats.totalJobs}`);
        console.log(`Active Admin Jobs: ${stats.activeJobs}`);

        // Show recent admin activities
        const recentSystemChecks = await cronx.getJobRuns('system-monitoring', 5);
        const recentFailures = recentSystemChecks.filter(run => run.status === 'failed');
        
        if (recentFailures.length > 0) {
          console.log(`⚠️  Recent system check failures: ${recentFailures.length}`);
        }

        console.log(`Last system check: ${recentSystemChecks[0]?.startTime || 'Never'}`);

      } catch (error) {
        console.error(`❌ [${workerId}] Admin dashboard error:`, error.message);
      }
    }, 60000);

  } catch (error) {
    console.error(`💥 [${workerId}] Failed to start admin tasks:`, error);
    console.log('💡 Make sure the storage backend is accessible');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n🔄 Admin worker ${process.env.WORKER_ID} shutting down gracefully...`);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(`\n🔄 Admin worker ${process.env.WORKER_ID} received SIGTERM, shutting down...`);
  process.exit(0);
});

adminTasksExample().catch(error => {
  console.error('💥 Admin tasks example failed:', error);
  process.exit(1);
});