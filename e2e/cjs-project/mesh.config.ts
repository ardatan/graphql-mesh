const { GraphQLSchema, GraphQLObjectType, GraphQLString } = require('graphql');
const { defineConfig: defineComposeConfig } = require('@graphql-mesh/compose-cli');
const { defineConfig: defineServeConfig } = require('@graphql-mesh/serve-cli');
const { Args } = require('../args');

const args = Args(process.argv);

const serveConfig = defineServeConfig({
  port: args.getPort(),
  fusiongraph: '',
});

const composeConfig = defineComposeConfig({
  port: args.get('target'),
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

module.exports = { serveConfig, composeConfig };
