#!/usr/bin/env node

import { Command } from 'commander';
import { listCommand } from './commands/list.js';
import { runCommand } from './commands/run.js';

const program = new Command();

program
  .name('cronx')
  .description('CLI for managing Cronx jobs')
  .version('1.0.0');

// Add commands
program.addCommand(listCommand);
program.addCommand(runCommand);

program.parse();