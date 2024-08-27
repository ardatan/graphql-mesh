#!/usr/bin/env node
import { run } from '@graphql-mesh/serve-cli';
import { DefaultLogger } from '@graphql-mesh/utils';

// @inject-version globalThis.__VERSION__ here

const log = new DefaultLogger();

run({
  log,
  productName: 'Hive Gateway',
  productDescription: 'Federated GraphQL Gateway',
  productPackageName: '@graphql-hive/gateway',
  productLogo: '🐝',
  configFileName: 'hive-gateway',
  binName: 'hive-gateway',
  version: globalThis.__VERSION__,
}).catch(err => {
  log.error(err);
  process.exit(1);
});
