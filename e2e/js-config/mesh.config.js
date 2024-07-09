import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';

export const composeConfig = {
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
};

export const serveConfig = {
  additionalResolvers: {
    Query: {
      hello() {
        return 'world';
      },
    },
  },
};
