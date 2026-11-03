#!/usr/bin/env node
// eslint-disable-next-line import/no-nodejs-modules
import { Console } from 'console';
import { ConsoleLogWriter, Logger } from '@graphql-hive/logger';
import { run } from './run.js';

const log = new Logger({
  writers: [new ConsoleLogWriter({ console: new Console(globalThis.process?.stderr) })],
});

run({ log }).catch(err => {
  log.error(err);
  globalThis.process?.exit(1);
});
