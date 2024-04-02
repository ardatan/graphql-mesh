const { GraphQLSchema } = require('graphql');
const { defineConfig: defineComposeConfig } = require('@graphql-mesh/compose-cli');
const { defineConfig: defineServeConfig } = require('@graphql-mesh/serve-cli');
const { getPortArg, getTargetArg } = require('../args');

const serveConfig = defineServeConfig({
  port: getPortArg(process.argv),
  fusiongraph: '',
});

const composeConfig = defineComposeConfig({
  target: getTargetArg(process.argv),
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
