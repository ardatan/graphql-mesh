
import type { LoadGraphQLSchemaFromNeo4JOpts } from './schema.js';
import { loadGraphQLSchemaFromNeo4J } from './schema.js';
import { Logger } from '@graphql-hive/logger';

export function loadNeo4JSubgraph(name: string, opts: LoadGraphQLSchemaFromNeo4JOpts) {
  return ({ log}: { log: Logger }) => ({
    name,
    schema$: loadGraphQLSchemaFromNeo4J(name, {
      ...opts,
      log,
    }),
  });
}

export * from './schema.js';
export * from '@graphql-mesh/transport-neo4j';
