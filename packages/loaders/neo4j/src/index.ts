import { type Logger } from '@graphql-hive/logger';
import type { LoadGraphQLSchemaFromNeo4JOpts } from './schema.js';
import { loadGraphQLSchemaFromNeo4J } from './schema.js';

/**
 * Compose-CLI source handler for a Neo4j subgraph.
 *
 * Returns a factory Mesh can call with its logger; the factory loads the schema via
 * {@link loadGraphQLSchemaFromNeo4J}.
 *
 * @param name - Subgraph name (also stamped as `subgraph:` on Neo4j directives).
 * @param opts - Connection / SDL options ({@link LoadGraphQLSchemaFromNeo4JOpts}).
 *
 * @example
 * ```ts
 * import { defineConfig } from '@graphql-mesh/compose-cli'
 * import { loadNeo4JSubgraph } from '@omnigraph/neo4j'
 *
 * export const composeConfig = defineConfig({
 *   subgraphs: [
 *     {
 *       sourceHandler: loadNeo4JSubgraph('Movies', {
 *         endpoint: 'neo4j://localhost:7687',
 *         auth: { type: 'basic', username: 'neo4j', password: 'secret' },
 *         database: 'neo4j',
 *       }),
 *     },
 *   ],
 * })
 * ```
 */
export function loadNeo4JSubgraph(name: string, opts: LoadGraphQLSchemaFromNeo4JOpts) {
  return ({ log }: { log: Logger }) => ({
    name,
    schema$: loadGraphQLSchemaFromNeo4J(name, {
      ...opts,
      log,
    }),
  });
}

export * from './schema.js';
export * from '@graphql-mesh/transport-neo4j';
