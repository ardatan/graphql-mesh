#!/usr/bin/env node
import { run } from '@graphql-mesh/serve-cli';
import { DefaultLogger } from '@graphql-mesh/utils';
import { hiveProductConfig } from './hiveProductConfig';

// @inject-version globalThis.__VERSION__ here

const log = new DefaultLogger();

run({
  log,
  ...hiveProductConfig,
  version: globalThis.__VERSION__,
}).catch(err => {
  log.error(err);
  process.exit(1);
});
