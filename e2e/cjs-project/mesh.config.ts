const { GraphQLSchema } = require('graphql');
const { defineConfig: defineComposeConfig } = require('@graphql-mesh/compose-cli');
const { defineConfig: defineServeConfig } = require('@graphql-mesh/serve-cli');

const serveConfig = defineServeConfig({
  port: parseInt(process.argv[2]), // test provides the port
  fusiongraph: '',
});

const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: () => ({
        name: 'test',
        schema$: new GraphQLSchema({}),
      }),
    },
  ],
});

module.exports = { serveConfig, composeConfig };
