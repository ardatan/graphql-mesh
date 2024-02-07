#!/usr/bin/env node
import { runServeCLI } from './runServeCLI.js';
import 'ts-node/register';
import 'dotenv/config';
import 'json-bigint-patch';

runServeCLI().catch(e => {
  console.error(e);
  process.exit(1);
});
