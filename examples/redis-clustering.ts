import { Cronx } from '../packages/core/dist/index.js';

// Simulate multiple workers for clustering demonstration
async function createWorker(workerId: string, port: number = 6379) {
  const cronx = new Cronx({
    storage: `redis://localhost:${port}`,
    workerId,
    metrics: true
  });

  return cronx;
}

async function redisClusteringExample() {
  console.log('🔗 Starting Redis Clustering Example...');
  console.log('This demonstrates how multiple Cronx workers coordinate via Redis');

  // Create multiple workers
  const worker1 = await createWorker('worker-1');
  const worker2 = await createWorker('worker-2');
  const worker3 = await createWorker('worker-3');

  const workers = [worker1, worker2, worker3];

  try {
    // Schedule the same jobs on all workers - only one should execute each time
    const sharedJobSchedule = async (cronx: any, workerId: string) => {
      // Distributed task that should only run on one worker at a time
      await cronx.schedule('*/10 * * * * *', async () => {
        const startTime = Date.now();
        console.log(`🔄 [${workerId}] Executing distributed task...`);
        
        // Simulate work that takes varying time
        const workDuration = Math.random() * 2000 + 1000; // 1-3 seconds
        await new Promise(resolve => setTimeout(resolve, workDuration));
        
        const result = {
          workerId,
          executionTime: Date.now() - startTime,
          processedItems: Math.floor(Math.random() * 100),
          timestamp: new Date().toISOString()
        };
        
        console.log(`✅ [${workerId}] Distributed task completed in ${result.executionTime}ms`);
        return result;
      }, {
        name: 'distributed-task',
        timeout: 5000,
        retries: 2,
        onSuccess: (result) => {
          console.log(`🎯 [${result.workerId}] Successfully processed ${result.processedItems} items`);
        },
        onError: (error) => {
          console.log(`❌ [${workerId}] Distributed task failed: ${error.message}`);
        }
      });

      // High-frequency task to demonstrate load distribution
      await cronx.schedule('*/3 * * * * *', async () => {
        console.log(`⚡ [${workerId}] High-frequency distributed job`);
        return { 
          workerId, 
          executed: Date.now(),
          jobType: 'high-frequency'
        };
      }, {
        name: 'high-freq-distributed',
        timeout: 1000
      });

      // Maintenance task - should only run on one worker
      await cronx.schedule('*/20 * * * * *', async () => {
        console.log(`🔧 [${workerId}] Running maintenance task...`);
        
        // Simulate maintenance work
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return {
          workerId,
          maintenanceType: 'cleanup',
          itemsCleaned: Math.floor(Math.random() * 20),
          timestamp: new Date()
        };
      }, {
        name: 'maintenance-task',
        timeout: 3000,
        onSuccess: (result) => {
          console.log(`🧹 [${result.workerId}] Maintenance cleaned ${result.itemsCleaned} items`);
        }
      });
    };

    // Schedule jobs on all workers
    console.log('📅 Scheduling distributed jobs on all workers...');
    await Promise.all(workers.map((worker, index) => 
      sharedJobSchedule(worker, `worker-${index + 1}`)
    ));

    // Start all workers
    console.log('🚀 Starting all workers...');
    await Promise.all(workers.map(worker => worker.start()));
    
    console.log('✨ All workers started! Observing distributed coordination...');
    console.log('👀 Watch how only one worker executes each job instance due to Redis locking\n');

    // Monitor and demonstrate clustering behavior
    let monitoringInterval = setInterval(async () => {
      try {
        // Get stats from first worker (all workers share the same Redis data)
        const stats = await worker1.getStats();
        const jobStats = await worker1.getJobStats();
        
        console.log(`\n📊 Cluster Stats - Total Jobs: ${stats.totalJobs}, Successful Runs: ${jobStats.successfulRuns}, Failed Runs: ${jobStats.failedRuns}`);
        
      } catch (error) {
        console.log('📊 Stats temporarily unavailable');
      }
    }, 15000);

    // Demonstrate worker failure and recovery
    setTimeout(async () => {
      console.log('\n🔄 Simulating worker-2 restart...');
      await worker2.stop();
      console.log('⏹️  Worker-2 stopped');
      
      setTimeout(async () => {
        await worker2.start();
        console.log('🔄 Worker-2 restarted - jobs continue seamlessly');
      }, 5000);
    }, 25000);

    // Show detailed job execution history
    setTimeout(async () => {
      console.log('\n📋 --- Distributed Job Execution History ---');
      
      const distributedRuns = await worker1.getJobRuns('distributed-task', 10);
      console.log(`Distributed task executions: ${distributedRuns.length}`);
      
      distributedRuns.slice(0, 5).forEach((run, index) => {
        const result = run.result as any;
        if (result && result.workerId) {
          console.log(`  ${index + 1}. Executed by ${result.workerId} - Duration: ${result.executionTime}ms`);
        }
      });

      const maintenanceRuns = await worker1.getJobRuns('maintenance-task', 5);
      console.log(`\nMaintenance task executions: ${maintenanceRuns.length}`);
      
      maintenanceRuns.forEach((run, index) => {
        const result = run.result as any;
        if (result && result.workerId) {
          console.log(`  ${index + 1}. Maintenance by ${result.workerId} - Cleaned: ${result.itemsCleaned} items`);
        }
      });

    }, 35000);

    // Cleanup after demonstration
    setTimeout(async () => {
      clearInterval(monitoringInterval);
      
      console.log('\n🛑 Stopping all workers...');
      await Promise.all(workers.map(worker => worker.stop()));
      
      console.log('✅ Redis clustering demonstration completed!');
      console.log('🎯 Key observations:');
      console.log('   - Only one worker executed each job instance');
      console.log('   - Jobs continued running even when workers restarted');
      console.log('   - Redis provided reliable distributed coordination');
      
      process.exit(0);
    }, 45000);

  } catch (error) {
    console.error('❌ Failed to start Redis clustering example:', error);
    console.log('💡 Make sure Redis is running on localhost:6379');
    
    // Cleanup on error
    await Promise.all(workers.map(worker => worker.stop().catch(() => {})));
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down all workers gracefully...');
  process.exit(0);
});

redisClusteringExample().catch(error => {
  console.error('💥 Redis clustering example failed:', error);
  process.exit(1);
});