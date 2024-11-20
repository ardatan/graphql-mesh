#!/usr/bin/env node
// eslint-disable-next-line import/no-nodejs-modules
import { Console } from 'console';
import { DefaultLogger } from '@graphql-mesh/utils';
import { run } from './run.js';

const log = new DefaultLogger(undefined, undefined, undefined, new Console(process.stderr));

run({ log }).catch(err => {
  log.error(err);
  process.exit(1);
});
