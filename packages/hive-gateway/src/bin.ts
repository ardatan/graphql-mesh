#!/usr/bin/env node
import { enableModuleCachingIfPossible, handleNodeWarnings, run } from '@graphql-mesh/serve-cli';
import { DefaultLogger } from '@graphql-mesh/utils';
import { hiveProductConfig } from './hiveProductConfig.js';

// @inject-version globalThis.__VERSION__ here

enableModuleCachingIfPossible();
handleNodeWarnings();

const log = new DefaultLogger();

run({
  log,
  ...hiveProductConfig,
  version: globalThis.__VERSION__,
}).catch(err => {
  log.error(err);
  process.exit(1);
});
