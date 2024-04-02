import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { getPortArg, getTargetArg } from '../args';

export const serveConfig = defineServeConfig({
  port: getPortArg(process.argv),
  fusiongraph: '',
});

export const composeConfig = defineComposeConfig({
  target: getTargetArg(process.argv),
  subgraphs: [
    {
      sourceHandler: () => ({
        name: 'test',
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
