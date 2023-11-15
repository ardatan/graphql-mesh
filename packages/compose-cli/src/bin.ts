#!/usr/bin/env node
import { runComposeCLI, spinnies } from './runComposeCLI.js';
import 'ts-node/register';
import 'dotenv/config';

runComposeCLI().catch(e => {
  spinnies.stopAll('fail');
  console.error(e);
  process.exit(1);
});
