import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';

export const serveConfig = defineServeConfig({
  proxy: {
    endpoint: 'https://countries.trevorblades.com',
  },
});
