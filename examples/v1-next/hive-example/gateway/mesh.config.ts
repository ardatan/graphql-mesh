import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import 'dotenv/config';

export const serveConfig = defineServeConfig({
  hive: {
    endpoint: process.env['HIVE_CDN_ENDPOINT']!,
    key: process.env['HIVE_CDN_KEY']!,
    token: process.env['HIVE_REGISTRY_TOKEN']!,
  },
});
