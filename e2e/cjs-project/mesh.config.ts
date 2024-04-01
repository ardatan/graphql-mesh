const { defineConfig } = require('@graphql-mesh/serve-cli');

const serveConfig = defineConfig({
  port: 55100,
  fusiongraph: '',
});

module.exports = { serveConfig };
