import { defineConfig } from '@graphql-hive/gateway';
import UpstashRedisCache from '@graphql-mesh/cache-upstash-redis';
import useHTTPCache from '@graphql-mesh/plugin-http-cache';

const config: ReturnType<typeof defineConfig> = {};

if (process.env.CACHE_STORAGE === 'upstash-redis') {
  config.cache = new UpstashRedisCache();
} else {
  config.cache = {
    // @ts-expect-error - We know it
    type: process.env.CACHE_STORAGE,
  };
}
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
