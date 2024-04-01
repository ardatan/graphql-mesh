import { defineConfig } from '@graphql-mesh/serve-cli';

export const serveConfig = defineConfig({
  port: parseInt(process.argv[2]), // test provides the port
  fusiongraph: '',
});
