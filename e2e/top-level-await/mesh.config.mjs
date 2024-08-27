import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineGatewayConfig } from '@graphql-mesh/serve-cli';

// top level await
await Promise.resolve();

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: () => ({
        name: 'helloworld',
        schema$: new GraphQLSchema({
          query: new GraphQLObjectType({
            name: 'Query',
            fields: {
              hello: {
                type: GraphQLString,
                resolve: () => 'world',
              },
            },
          }),
        }),
      }),
    },
  ],
});

export const gatewayConfig = defineGatewayConfig({});
