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
    ttlPerType: {
      // Just like a default TTL set in Apollo Server,
      // We do the same thing in response caching plugin to replicate the behavior
      Comment: 5_000,
    },
  };
} else {
  throw new Error(`Unknown caching plugin: ${process.env.CACHE_PLUGIN}`);
}

export const gatewayConfig = defineConfig(config);
