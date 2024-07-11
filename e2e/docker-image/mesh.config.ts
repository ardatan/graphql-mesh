import { defineConfig } from '@graphql-mesh/serve-cli';

export const serveConfig = defineConfig({
  proxy: {
    endpoint: 'https://countries.trevorblades.com',
  },
});
