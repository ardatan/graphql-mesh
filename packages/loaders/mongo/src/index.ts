import { process as meshProcess } from '@graphql-mesh/cross-helpers';
import type { LoadMongoSubgraphOpts } from './schema.js';
import { loadGraphQLSchemaFromMongo } from './schema.js';

export * from './directives.js';
export * from './naming.js';
export * from './scalars.js';
export * from './schema.js';
export * from './type-map.js';

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
