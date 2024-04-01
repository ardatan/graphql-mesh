const { defineConfig } = require('@graphql-mesh/serve-cli');

const serveConfig = defineConfig({
  port: parseInt(process.argv[2]), // test provides the port
  fusiongraph: '',
});

module.exports = { serveConfig };
