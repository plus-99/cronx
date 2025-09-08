import { Command } from 'commander';
import { Cronx } from '@plus99/cronx';

export const statsCommand = new Command('stats')
  .description('Show job statistics and metrics')
  .option('-s, --storage <storage>', 'Storage connection string', 'sqlite://./cronx.db')
  .option('-j, --job <jobName>', 'Show stats for specific job')
  .action(async (options) => {
    try {
      const cronx = new Cronx({
        storage: options.storage,
        workerId: 'cli-stats'
      });

      await cronx.start();

      if (options.job) {
        // Show stats for specific job
        const job = await cronx.getJob(options.job);
        if (!job) {
          console.log(`Job '${options.job}' not found.`);
          await cronx.stop();
          return;
        }

        const stats = await cronx.getJobStats(options.job);
        const runs = await cronx.getJobRuns(options.job, 10);

        console.log(`\\nJob Statistics: ${options.job}`);
        console.log('='.repeat(30 + options.job.length));
        console.log(`Status: ${job.isActive ? (job.isPaused ? 'Paused' : 'Active') : 'Inactive'}`);
        console.log(`Schedule: ${job.schedule}`);
        console.log(`Created: ${job.createdAt.toISOString()}`);
        console.log(`Last Run: ${job.lastRun?.toISOString() || 'Never'}`);
        console.log(`Next Run: ${job.nextRun?.toISOString() || 'Unknown'}`);
        console.log(`\\nExecution Statistics:`);
        console.log(`Total Runs: ${stats.totalRuns}`);
        console.log(`Successful: ${stats.successfulRuns}`);
        console.log(`Failed: ${stats.failedRuns}`);
        console.log(`Success Rate: ${stats.totalRuns > 0 ? ((stats.successfulRuns / stats.totalRuns) * 100).toFixed(1) + '%' : 'N/A'}`);
        console.log(`Average Duration: ${stats.averageDuration.toFixed(2)}ms`);

        if (runs.length > 0) {
          console.log(`\\nRecent Runs (last ${runs.length}):`);
          runs.forEach((run, i) => {
            const duration = run.startTime && run.endTime 
              ? run.endTime.getTime() - run.startTime.getTime() 
              : 0;
            console.log(`  ${i + 1}. ${run.status.toUpperCase()} - ${run.startTime?.toISOString()} (${duration}ms)`);
            if (run.error) {
              console.log(`     Error: ${run.error}`);
            }
          });
        }
      } else {
        // Show overall stats
        const cronxStats = await cronx.getStats();
        const allStats = await cronx.getJobStats();
        const jobs = await cronx.listJobs();

        console.log('\\nCronx Statistics');
        console.log('================');
        console.log(`Worker ID: ${cronxStats.workerId}`);
        console.log(`Status: ${cronxStats.isRunning ? 'Running' : 'Stopped'}`);
        console.log(`Total Jobs: ${cronxStats.totalJobs}`);
        console.log(`Active Jobs: ${cronxStats.activeJobs}`);
        console.log(`Paused Jobs: ${cronxStats.pausedJobs}`);

        console.log(`\\nOverall Execution Statistics:`);
        console.log(`Total Runs: ${allStats.totalRuns}`);
        console.log(`Successful: ${allStats.successfulRuns}`);
        console.log(`Failed: ${allStats.failedRuns}`);
        console.log(`Success Rate: ${allStats.totalRuns > 0 ? ((allStats.successfulRuns / allStats.totalRuns) * 100).toFixed(1) + '%' : 'N/A'}`);
        console.log(`Average Duration: ${allStats.averageDuration.toFixed(2)}ms`);

        if (jobs.length > 0) {
          console.log(`\\nJobs Summary:`);
          for (const job of jobs) {
            const status = job.isActive ? (job.isPaused ? 'PAUSED' : 'ACTIVE') : 'INACTIVE';
            console.log(`  • ${job.name} (${status}) - ${job.schedule}`);
          }
        }
      }

      await cronx.stop();
      
    } catch (error) {
      console.error('Error getting statistics:', error);
      process.exit(1);
    }
  });