import { Cronx } from '../packages/core/dist/index.js';

async function performanceMonitorExample() {
  const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
  const postgresUrl = process.env.POSTGRES_URL || 'postgresql://cronx:cronx_password@postgres:5432/cronx';
  const workerId = process.env.WORKER_ID || 'performance-monitor';

  console.log(`📊 Starting Performance Monitor: ${workerId}`);

  // Create multiple Cronx instances to monitor different backends
  const redisCronx = new Cronx({
    storage: redisUrl,
    workerId: `${workerId}-redis`,
    metrics: true
  });

  const postgresCronx = new Cronx({
    storage: postgresUrl,
    workerId: `${workerId}-postgres`,
    metrics: true
  });

  try {
    // Start both schedulers FIRST
    await redisCronx.start();
    await postgresCronx.start();

    // Redis performance monitoring
    await redisCronx.schedule('*/10 * * * * *', async () => {
      const startTime = Date.now();
      
      // Simulate Redis operations
      const operations = [
        'set_operations',
        'get_operations', 
        'list_operations',
        'hash_operations'
      ];
      
      const results = {};
      
      for (const op of operations) {
        const opStart = Date.now();
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
        results[op] = Date.now() - opStart;
      }
      
      const totalTime = Date.now() - startTime;
      
      console.log(`🔴 Redis Performance - Total: ${totalTime}ms, Ops: ${Object.values(results).join('ms, ')}ms`);
      
      return {
        backend: 'redis',
        totalExecutionTime: totalTime,
        operationTimes: results,
        timestamp: new Date(),
        monitorWorker: workerId
      };
    }, {
      name: 'redis-performance-monitor',
      timeout: 5000
    });

    // PostgreSQL performance monitoring
    await postgresCronx.schedule('*/15 * * * * *', async () => {
      const startTime = Date.now();
      
      // Simulate PostgreSQL operations
      const dbOperations = [
        'select_queries',
        'insert_operations',
        'update_operations',
        'delete_operations',
        'index_scans'
      ];
      
      const results = {};
      
      for (const op of dbOperations) {
        const opStart = Date.now();
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 20));
        results[op] = Date.now() - opStart;
      }
      
      const totalTime = Date.now() - startTime;
      
      console.log(`🐘 PostgreSQL Performance - Total: ${totalTime}ms, Queries: ${Object.values(results).join('ms, ')}ms`);
      
      return {
        backend: 'postgresql',
        totalExecutionTime: totalTime,
        operationTimes: results,
        timestamp: new Date(),
        monitorWorker: workerId
      };
    }, {
      name: 'postgres-performance-monitor',
      timeout: 8000
    });

    // Cross-backend comparison
    await redisCronx.schedule('*/30 * * * * *', async () => {
      console.log(`🔍 ${workerId} Running cross-backend performance comparison...`);
      
      try {
        // Get stats from both backends
        const redisStats = await redisCronx.getStats();
        const postgresStats = await postgresCronx.getStats();
        
        // Get recent performance data
        const redisPerf = await redisCronx.getJobRuns('redis-performance-monitor', 5);
        const postgresPerf = await postgresCronx.getJobRuns('postgres-performance-monitor', 5);
        
        const comparison = {
          redis: {
            totalJobs: redisStats.totalJobs,
            isRunning: redisStats.isRunning,
            recentRuns: redisPerf.length,
            avgDuration: redisPerf.length > 0 ? 
              redisPerf.reduce((sum, run) => sum + (run.endTime && run.startTime ? 
                (run.endTime.getTime() - run.startTime.getTime()) : 0), 0) / redisPerf.length : 0
          },
          postgres: {
            totalJobs: postgresStats.totalJobs,
            isRunning: postgresStats.isRunning,
            recentRuns: postgresPerf.length,
            avgDuration: postgresPerf.length > 0 ? 
              postgresPerf.reduce((sum, run) => sum + (run.endTime && run.startTime ? 
                (run.endTime.getTime() - run.startTime.getTime()) : 0), 0) / postgresPerf.length : 0
          }
        };
        
        console.log(`📈 Performance Comparison:`);
        console.log(`  Redis: ${comparison.redis.recentRuns} runs, ${comparison.redis.avgDuration.toFixed(0)}ms avg`);
        console.log(`  PostgreSQL: ${comparison.postgres.recentRuns} runs, ${comparison.postgres.avgDuration.toFixed(0)}ms avg`);
        
        return comparison;
        
      } catch (error) {
        console.log(`❌ Cross-backend comparison failed: ${error.message}`);
        throw error;
      }
    }, {
      name: 'cross-backend-comparison',
      timeout: 15000,
      retries: 1
    });

    // Resource usage monitoring
    await postgresCronx.schedule('*/20 * * * * *', async () => {
      const resourceMetrics = {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        pid: process.pid
      };
      
      const memoryMB = (resourceMetrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
      const uptimeHours = (resourceMetrics.uptime / 3600).toFixed(1);
      
      console.log(`💻 Resource Usage - Memory: ${memoryMB}MB, Uptime: ${uptimeHours}h`);
      
      return {
        ...resourceMetrics,
        memoryUsageMB: parseFloat(memoryMB),
        uptimeHours: parseFloat(uptimeHours),
        timestamp: new Date()
      };
    }, {
      name: 'resource-monitoring',
      timeout: 5000
    });

    // Start both schedulers
    await redisCronx.start();
    await postgresCronx.start();
    
    console.log(`📊 Performance Monitor ${workerId} started monitoring Redis and PostgreSQL!`);

    // Performance dashboard updates
    setInterval(async () => {
      try {
        console.log(`\n📊 --- Performance Dashboard (${workerId}) ---`);
        
        // Redis metrics
        const redisMetrics = await redisCronx.getMetrics();
        console.log(`🔴 Redis Backend: ${redisMetrics ? 'Metrics Available' : 'No Metrics'}`);
        
        const redisStats = await redisCronx.getStats();
        console.log(`  Jobs: ${redisStats.totalJobs}, Status: ${redisStats.isRunning ? '🟢' : '🔴'}`);
        
        // PostgreSQL metrics  
        const postgresMetrics = await postgresCronx.getMetrics();
        console.log(`🐘 PostgreSQL Backend: ${postgresMetrics ? 'Metrics Available' : 'No Metrics'}`);
        
        const postgresStats = await postgresCronx.getStats();
        console.log(`  Jobs: ${postgresStats.totalJobs}, Status: ${postgresStats.isRunning ? '🟢' : '🔴'}`);
        
        // Show recent performance trends
        const redisJobStats = await redisCronx.getJobStats('redis-performance-monitor');
        const postgresJobStats = await postgresCronx.getJobStats('postgres-performance-monitor');
        
        if (redisJobStats.totalRuns > 0 && postgresJobStats.totalRuns > 0) {
          console.log(`\n⚡ Performance Comparison:`);
          console.log(`  Redis avg: ${Math.round(redisJobStats.averageDuration)}ms (${redisJobStats.totalRuns} runs)`);
          console.log(`  PostgreSQL avg: ${Math.round(postgresJobStats.averageDuration)}ms (${postgresJobStats.totalRuns} runs)`);
        }

      } catch (error) {
        console.error(`❌ Performance dashboard error:`, error.message);
      }
    }, 90000);

  } catch (error) {
    console.error(`💥 Performance monitor failed to start:`, error);
    console.log('💡 Make sure both Redis and PostgreSQL are accessible');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n🔄 Performance monitor shutting down gracefully...`);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(`\n🔄 Performance monitor received SIGTERM, shutting down...`);
  process.exit(0);
});

performanceMonitorExample().catch(error => {
  console.error('💥 Performance monitor failed:', error);
  process.exit(1);
});