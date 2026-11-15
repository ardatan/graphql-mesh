import { Opts } from '@e2e/opts';
import {
  createFederationTransform,
  createRenameFieldTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

/**
 * type-merging-with-transforms shape WITHOUT additionalTypeDefs / `@resolveTo`.
 *
 * - books: plain GraphQL; `Book.author` stub on the service schema; rename `books`→`titles`
 *   shows Mesh transforms still apply (stitching `@source` / `@meshSource` on GraphQL).
 * - authors (virtual mode): plain GraphQL + federation `virtualConnect: true` → Apollo
 *   virtual `@connect(entity: true)` instead of Mesh `@merge`. Selection only echoes
 *   `$args.id` (no HTTP) so GraphQL `name` is not fetched.
 * - authors (federation mode): real `@apollo/subgraph` fills `name` via `_entities`.
 *
 * Set MESH_SPIKE_MODE=federation for the Federation dual-run path.
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
