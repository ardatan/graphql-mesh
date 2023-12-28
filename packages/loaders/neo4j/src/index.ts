import { GraphQLSchema } from 'graphql';
import { Neo4JAuthOpts } from './auth';
import { getNeo4JExecutor } from './executor';
import { loadGraphQLSchemaFromNeo4J, LoadGraphQLSchemaFromNeo4JOpts } from './schema';

export function loadNeo4JSubgraph(name: string, opts: LoadGraphQLSchemaFromNeo4JOpts) {
  return () => ({
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

export function getSubgraphExecutor(
  _transportEntry: Neo4JTransportEntry,
  getSubgraph: () => GraphQLSchema,
) {
  return getNeo4JExecutor({
    schema: getSubgraph(),
  });
}

export * from './schema';
export * from './executor';
export * from './driver';
export * from './auth';
