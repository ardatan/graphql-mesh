import { defineConfig } from '@graphql-mesh/serve-cli';

export const serveConfig = defineConfig({
  supergraph: './supergraph.graphql',
});
