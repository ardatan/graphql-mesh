#!/usr/bin/env node
import { run } from '.';

run().catch(e => {
  console.error(e);
  process.exit(1);
});
