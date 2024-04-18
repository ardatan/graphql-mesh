const { GraphQLSchema, GraphQLObjectType, GraphQLString } = require('graphql');
const { defineConfig } = require('@graphql-mesh/compose-cli');

const args = require('@e2e/args').Args(process.argv);

const composeConfig = defineConfig({
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

module.exports = { composeConfig };
