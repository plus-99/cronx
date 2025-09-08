import { Command } from 'commander';
import { Cronx } from '@plus99/cronx';

export const listCommand = new Command('list')
  .description('List all scheduled jobs')
  .option('-s, --storage <storage>', 'Storage connection string', 'sqlite://./cronx.db')
  .action(async (options) => {
    try {
      const cronx = new Cronx({
        storage: options.storage,
        workerId: 'cli-list'
      });

      await cronx.start();
      const jobs = await cronx.listJobs();
      await cronx.stop();

      if (jobs.length === 0) {
        console.log('No jobs found.');
        return;
      }

      console.log('\\nScheduled Jobs:');
      console.log('===============');
      
      for (const job of jobs) {
        console.log(`\\nName: ${job.name}`);
        console.log(`Schedule: ${job.schedule}`);
        console.log(`Active: ${job.isActive ? 'Yes' : 'No'}`);
        console.log(`Created: ${job.createdAt.toISOString()}`);
        console.log(`Last Run: ${job.lastRun?.toISOString() || 'Never'}`);
        console.log(`Next Run: ${job.nextRun?.toISOString() || 'Unknown'}`);
        
        if (job.options.retries) {
          console.log(`Retries: ${job.options.retries}`);
        }
        if (job.options.backoff) {
          console.log(`Backoff: ${job.options.backoff}`);
        }
        if (job.options.timeout) {
          console.log(`Timeout: ${job.options.timeout}ms`);
        }
        
        console.log('---');
      }
    } catch (error) {
      console.error('Error listing jobs:', error);
      process.exit(1);
    }
  });