import { Opts } from '@e2e/opts';
import {
  createHoistFieldTransform,
  createPrefixTransform,
  createRenameTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

/**
 * Catalog subgraph fields are reshaped before the gateway schema is served:
 * - types get a `Shop_` prefix
 * - nested `details.blurb` is hoisted to `productBlurb`
 * - `name` is renamed to `title`
 *
 * Deferred selections use the gateway names; upstream still sees `@defer` on
 * the unwrapped nested path when `deferStream.subgraph` is enabled.
 */
export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('catalog', {
        endpoint: `http://localhost:${opts.getServicePort('catalog')}/graphql`,
      }),
      transforms: [
        createPrefixTransform({
          value: 'Shop_',
        }),
        createHoistFieldTransform({
          mapping: [
            {
              typeName: 'Shop_Product',
              pathConfig: ['details', 'blurb'],
              newFieldName: 'productBlurb',
            },
          ],
        }),
        createRenameTransform({
          fieldRenamer: ({ typeName, fieldName }) =>
            typeName === 'Shop_Product' && fieldName === 'name' ? 'title' : fieldName,
        }),
      ],
    },
  ],
});
