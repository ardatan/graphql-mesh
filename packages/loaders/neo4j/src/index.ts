import { GraphQLSchema } from 'graphql';
import { Logger, MeshFetch, MeshPubSub } from '@graphql-mesh/types';
import { Neo4JAuthOpts } from './auth.js';
import { getNeo4JExecutor } from './executor.js';
import { loadGraphQLSchemaFromNeo4J, LoadGraphQLSchemaFromNeo4JOpts } from './schema.js';

export function loadNeo4JSubgraph(name: string, opts: LoadGraphQLSchemaFromNeo4JOpts) {
  return ({ logger }: { logger: Logger }) => ({
    name,
    schema$: loadGraphQLSchemaFromNeo4J(name, opts),
  });
}

export interface Neo4JTransportEntry {
  kind: 'neo4j';
  location: string;
  options: {
    database: string;
    auth: Neo4JAuthOpts;
  };
}

export function getSubgraphExecutor(transportContext: {
  getSubgraph: () => GraphQLSchema;
  fetch: MeshFetch;
  pubsub: MeshPubSub;
  logger: Logger;
}) {
  return getNeo4JExecutor({
    schema: transportContext.getSubgraph(),
    pubsub: transportContext.pubsub,
    logger: transportContext.logger,
  });
}

export * from './schema.js';
export * from './executor.js';
export * from './driver.js';
export * from './auth.js';
