import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';

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

export const gatewayConfig = defineGatewayConfig({
  additionalResolvers: {
    Query: {
      hello() {
        return 'world';
      },
    },
  },
});
