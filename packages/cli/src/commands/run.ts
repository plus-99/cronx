import { Command } from 'commander';
import { Cronx } from '@plus99/cronx';

export const runCommand = new Command('run')
  .description('Manually execute a job')
  .argument('<jobName>', 'Name of the job to run')
  .option('-s, --storage <storage>', 'Storage connection string', 'sqlite://./cronx.db')
  .action(async (jobName, options) => {
    try {
      const cronx = new Cronx({
        storage: options.storage,
        workerId: 'cli-run'
      });

      await cronx.start();
      
      console.log(`Executing job '${jobName}'...`);
      const result = await cronx.runJob(jobName);
      
      await cronx.stop();

      console.log('\\nJob Execution Result:');
      console.log('====================');
      console.log(`Run ID: ${result.id}`);
      console.log(`Status: ${result.status}`);
      console.log(`Started: ${result.startTime?.toISOString()}`);
      console.log(`Ended: ${result.endTime?.toISOString()}`);
      console.log(`Attempt: ${result.attempt}`);
      
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      
      if (result.result) {
        console.log(`Result: ${JSON.stringify(result.result, null, 2)}`);
      }
      
    } catch (error) {
      console.error(`Error running job '${jobName}':`, error);
      process.exit(1);
    }
  });