#!/usr/bin/env node
import { run } from './index.js';

console.warn(
  'This package is still in development, please use with caution, and report any issues if you have any.',
);

run().catch(e => {
  console.error(e);
  process.exit(1);
});
