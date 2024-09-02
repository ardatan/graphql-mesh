import { GraphQLID, GraphQLNonNull } from 'graphql';
import { getLocalHostName, Opts } from '@e2e/opts';
import {
  createFederationTransform,
  createTypeReplaceTransform,
  defineConfig as defineComposeConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('accounts', {
        source: `http://${getLocalHostName()}:${opts.getServicePort('accounts')}/openapi.json`,
        endpoint: `http://${getLocalHostName()}:${opts.getServicePort('accounts')}`,
      }),
      transforms: [
        createTypeReplaceTransform((typeName, fieldName) =>
          typeName === 'User' && fieldName === 'id' ? new GraphQLNonNull(GraphQLID) : undefined,
        ),
        createFederationTransform({
          User: {
            key: {
              fields: 'id',
              resolveReference: {
                keyArg: 'id',
                fieldName: 'user',
              },
            },
          },
        }),
      ],
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('products', {
        endpoint: `http://${getLocalHostName()}:${opts.getServicePort('products')}/graphql`,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('inventory', {
        endpoint: `http://${getLocalHostName()}:${opts.getServicePort('inventory')}/graphql`,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('reviews', {
        endpoint: `http://${getLocalHostName()}:${opts.getServicePort('reviews')}/graphql`,
      }),
    },
  ],
});
