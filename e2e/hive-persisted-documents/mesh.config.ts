import { defineConfig } from '@graphql-mesh/serve-cli';

export const serveConfig = defineConfig({
  proxy: {
    endpoint: `http://0.0.0.0:${process.env.UPSTREAM_PORT}/graphql`,
  },
  persistedDocuments: {
    type: 'hive',
    endpoint: `http://0.0.0.0:${process.env.HIVE_CDN_PORT}`,
    token: 'VERY_SECRET_TOKEN',
  },
});
