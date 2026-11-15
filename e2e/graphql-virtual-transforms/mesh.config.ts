import { Opts } from '@e2e/opts';
import {
  createFederationTransform,
  createRenameFieldTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

/**
 * Dual annotation (GraphQL only — no OpenAPI):
 * - Hive: Mesh `@merge` / `@source` (rename → stitching source)
 * - Router: virtual `@connect(entity: true)` beside `@merge` on the entity owner field
 *
 * Set MESH_SPIKE_MODE=federation for real Federation `_entities` authors (control).
 */
const mode = process.env.MESH_SPIKE_MODE || 'virtual';

export const composeConfig = defineConfig({
  subgraphs: [
    mode === 'federation'
      ? {
          sourceHandler: loadGraphQLHTTPSubgraph('authors', {
            endpoint: `http://localhost:${opts.getServicePort('authors-fed')}/graphql`,
          }),
        }
      : {
          sourceHandler: loadGraphQLHTTPSubgraph('authors', {
            endpoint: `http://localhost:${opts.getServicePort('authors')}/graphql`,
          }),
          transforms: [
            createFederationTransform({
              Author: {
                key: {
                  fields: 'id',
                  resolveReference: {
                    fieldName: 'author',
                    keyArg: 'id',
                    // Dual: keep @merge for Hive; also emit virtual @connect for Router.
                    virtualConnect: true,
                  },
                },
              },
            }),
          ],
        },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('books', {
        endpoint: `http://localhost:${opts.getServicePort('books')}/graphql`,
      }),
      transforms: [
        createRenameFieldTransform(({ fieldName, typeName }) =>
          typeName === 'Query' && fieldName === 'books' ? 'bookList' : fieldName,
        ),
      ],
    },
  ],
});
