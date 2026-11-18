import { process as meshProcess } from '@graphql-mesh/cross-helpers';
import type { LoadMongoSubgraphOpts } from './schema.js';
import { loadGraphQLSchemaFromMongo } from './schema.js';

export * from './directives.js';
export * from './naming.js';
export * from './scalars.js';
export * from './schema.js';
export * from './type-map.js';

/**
 * Mesh compose helper: returns a lazy subgraph factory backed by
 * {@link loadGraphQLSchemaFromMongo}.
 *
 * @example
 * ```ts
 * import { loadMongoSubgraph } from '@omnigraph/mongo';
 *
 * export const subgraphs = [
 *   loadMongoSubgraph('users', {
 *     endpoint: process.env.MONGO_URL!,
 *     models: [{ name: 'User', path: './models#User' }],
 *   }),
 * ];
 * ```
 */
export function loadMongoSubgraph(name: string, opts: LoadMongoSubgraphOpts) {
  return () => ({
    name,
    schema$: loadGraphQLSchemaFromMongo(name, {
      ...opts,
      cwd: opts.cwd || meshProcess.cwd(),
    }),
  });
}

export { getMongoExecutor } from '@graphql-mesh/transport-mongo';
