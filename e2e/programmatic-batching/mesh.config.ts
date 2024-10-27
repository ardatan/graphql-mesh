import { print } from 'graphql';
import { Opts } from '@e2e/opts';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineGatewayConfig } from '@graphql-mesh/serve-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('API', {
        source: `http://localhost:${opts.getServicePort('api')}/openapi.json`,
        endpoint: `http://localhost:${opts.getServicePort('api')}`,
        ignoreErrorResponses: true,
      }),
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type Query {
      user(id: Float!): User
    }
  `,
});

export const gatewayConfig = defineGatewayConfig({
  additionalResolvers: {
    Query: {
      user(root, args, context: any, info) {
        return context.API.Mutation.usersByIds({
          root,
          context,
          info,
          // Key for the following batched request
          key: args.id,
          // Arguments for the following batched request
          argsFromKeys: ids => ({ input: { ids } }),
          // Function to extract the result from the batched response
          valuesFromResults: data => data?.results,
          // Function to generate the selectionSet for the batched request
          selectionSet: userSelectionSet => /* GraphQL */ `
          {
            results ${print(userSelectionSet)} # Will print something like { id name }
          }
        `,
        });
      },
    },
  },
});
