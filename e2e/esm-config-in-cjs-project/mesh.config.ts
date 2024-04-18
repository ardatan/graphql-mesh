import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { Args } from '@e2e/args';
import { defineConfig } from '@graphql-mesh/compose-cli';

const args = Args(process.argv);

export const composeConfig = defineConfig({
  output: args.get('output'),
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
