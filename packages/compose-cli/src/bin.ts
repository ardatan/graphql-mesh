#!/usr/bin/env node
import { runComposeCLI, spinnies } from './runComposeCLI.js';
import 'dotenv/config';
import 'tsx/cjs';

runComposeCLI().catch(e => {
  spinnies.stopAll('fail');
  console.error(e);
  process.exit(1);
});
