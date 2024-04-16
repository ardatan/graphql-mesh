#!/usr/bin/env node
import { runServeCLI } from './runServeCLI.js';
import 'dotenv/config';
import 'json-bigint-patch';
import 'tsx/cjs';

runServeCLI().catch(e => {
  console.error(e);
  process.exit(1);
});
