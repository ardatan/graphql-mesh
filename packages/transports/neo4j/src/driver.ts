import neo4j from 'neo4j-driver';

import type { Neo4JAuthOpts } from './auth.js';
import { getAuthFromOpts } from './auth.js';
import { Logger } from '@graphql-hive/logger';

export interface Neo4JDriverOpts {
  endpoint: string;
  auth?: Neo4JAuthOpts;
  log?: Logger;
}

export function getDriverFromOpts(opts: Neo4JDriverOpts) {
  return neo4j.driver(opts.endpoint, getAuthFromOpts(opts.auth), {
    useBigInt: true,
    logging: opts.log && {
      logger: (level, message) => opts.log[level](message),
    },
    trustedCertificates: [],
  });
}
