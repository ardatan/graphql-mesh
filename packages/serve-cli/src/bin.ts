#!/usr/bin/env node
import { DefaultLogger } from '@graphql-mesh/utils';
import { handleNodeWarnings, run } from './cli.js';

// @inject-version globalThis.__VERSION__ here

handleNodeWarnings();

const log = new DefaultLogger();

run({ log }).catch(err => {
  log.error(err);
  process.exit(1);
});
