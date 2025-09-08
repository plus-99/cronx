import { spawn } from 'child_process';
import { readdir } from 'fs/promises';

async function runExamples() {
  console.log('🚀 Starting Cronx Examples');
  console.log('==========================');
  
  try {
    // Get all example files
    const files = await readdir('./examples');
    const tsFiles = files.filter(f => f.endsWith('.ts'));
    
    if (tsFiles.length === 0) {
      console.log('No example files found.');
      return;
    }

    console.log(`Found ${tsFiles.length} example(s): ${tsFiles.join(', ')}`);
    console.log('\\nRunning basic example (others available: sqlite-example.ts, clustering.ts)');
    console.log('You can also try: npm run example:sqlite or npm run example:cluster');
    console.log('\\n' + '='.repeat(50));
    
    // Run basic example
    const child = spawn('tsx', ['examples/basic.ts'], {
      stdio: 'inherit',
      shell: true
    });

    child.on('error', (error) => {
      console.error('Failed to start example:', error);
    });

    child.on('close', (code) => {
      console.log(`\\nExample finished with code ${code}`);
    });

  } catch (error) {
    console.error('Error running examples:', error);
  }
}

runExamples();