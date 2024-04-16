import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { Args } from '@e2e/args';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';

const args = Args(process.argv);

export const serveConfig = defineServeConfig({
  port: args.getPort(),
  fusiongraph: '',
});

export const composeConfig = defineComposeConfig({
  target: args.get('target'),
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
