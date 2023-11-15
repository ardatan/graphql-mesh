import { GraphQLSchema } from 'graphql';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { getMySQLExecutor } from './execution.js';
import { loadGraphQLSchemaFromMySQL, LoadGraphQLSchemaFromMySQLOpts } from './schema.js';

export * from './schema.js';
export * from './execution.js';

export function loadMySQLSubgraph(name: string, opts: LoadGraphQLSchemaFromMySQLOpts) {
  return () => ({
    name,
    schema$: loadGraphQLSchemaFromMySQL(name, opts),
  });
}

export interface MySQLTransportEntry {
  kind: 'mysql';
  location: string;
}

export function getSubgraphExecutor(transportContext: {
  getSubgraph: () => GraphQLSchema;
  pubsub: MeshPubSub;
  logger: Logger;
}) {
  return getMySQLExecutor({
    subgraph: transportContext.getSubgraph(),
    pubsub: transportContext.pubsub,
    logger: transportContext.logger,
  });
}
