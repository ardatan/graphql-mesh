import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { getTargetArg } from '../args';

export const composeConfig = defineConfig({
  target: getTargetArg(process.argv),
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
