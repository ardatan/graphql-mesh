import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { Args } from '../args';

export const composeConfig = defineConfig({
  target: Args(process.argv).get('target', true),
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
