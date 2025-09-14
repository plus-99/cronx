#!/usr/bin/env node

import { Command } from 'commander';
import { listCommand } from './commands/list';
import { runCommand } from './commands/run';
import { statsCommand } from './commands/stats';

const program = new Command();

program
  .name('cronx')
  .description('CLI for managing Cronx jobs')
  .version('1.0.1');

// Add commands
program.addCommand(listCommand);
program.addCommand(runCommand);
program.addCommand(statsCommand);

program.parse();