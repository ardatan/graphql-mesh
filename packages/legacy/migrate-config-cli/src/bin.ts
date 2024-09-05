#!/usr/bin/env node
import { run } from './index.js';

run().catch(e => {
  console.error(e);
  process.exit(1);
});
