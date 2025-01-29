import { defineConfig } from '@graphql-hive/gateway';
import useHTTPCache from '@graphql-mesh/plugin-http-cache';

const config: ReturnType<typeof defineConfig> = {
  cache: {
    // @ts-expect-error - CacheStorage type mismatch
    type: process.env.CACHE_STORAGE,
  },
};

console.log(`Using cache storage: ${process.env.CACHE_STORAGE}`);

console.log(`Using cache plugin: ${process.env.CACHE_PLUGIN}`);
if (process.env.CACHE_PLUGIN === 'HTTP Caching') {
  config.plugins = ctx => [useHTTPCache(ctx)];
} else if (process.env.CACHE_PLUGIN === 'Response Caching') {
  config.responseCaching = {
    session: () => null,
  };
} else {
  throw new Error(`Unknown caching plugin: ${process.env.CACHE_PLUGIN}`);
}

export const gatewayConfig = defineConfig(config);
