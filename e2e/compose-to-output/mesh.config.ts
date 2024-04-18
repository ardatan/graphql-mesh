import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { Args } from '@e2e/args';
import { defineConfig } from '@graphql-mesh/compose-cli';

export const composeConfig = defineConfig({
  output: Args(process.argv).get('output', true),
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
