import type { Logger } from '@graphql-mesh/types';
import type { LoadGraphQLSchemaFromNeo4JOpts } from './schema.js';
import { loadGraphQLSchemaFromNeo4J } from './schema.js';

export function loadNeo4JSubgraph(name: string, opts: LoadGraphQLSchemaFromNeo4JOpts) {
  return ({ logger }: { logger: Logger }) => ({
    name,
    schema$: loadGraphQLSchemaFromNeo4J(name, {
      ...opts,
      logger,
    }),
  });
}

export * from './schema.js';
export * from '@graphql-mesh/transport-neo4j';
