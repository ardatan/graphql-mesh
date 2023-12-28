import neo4j from 'neo4j-driver';
import { Logger } from '@graphql-mesh/types';
import { getAuthFromOpts, Neo4JAuthOpts } from './auth';

export interface Neo4JDriverOpts {
  endpoint: string;
  auth?: Neo4JAuthOpts;
  logger?: Logger;
}

export function getDriverFromOpts(opts: Neo4JDriverOpts) {
  return neo4j.driver(opts.endpoint, getAuthFromOpts(opts.auth), {
    useBigInt: true,
    logging: opts.logger && {
      logger: (level, message) => opts.logger[level](message),
    },
  });
}
