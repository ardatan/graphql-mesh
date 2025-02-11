import { defineConfig } from '@graphql-hive/gateway';
import UpstashRedisCache from '@graphql-mesh/cache-upstash-redis';
import useHTTPCache from '@graphql-mesh/plugin-http-cache';

const config: ReturnType<typeof defineConfig> = {};

if (!process.env.MESH_COMPOSE) {
  const VALID_CACHE_STORAGES = ['upstash-redis', 'inmemory-lru', 'redis'];

  const cacheStorage = process.env.CACHE_STORAGE;

  if (!cacheStorage) {
    throw new Error('CACHE_STORAGE env var is required');
  }

  if (!VALID_CACHE_STORAGES.includes(cacheStorage)) {
    throw new Error(`Invalid cache storage: ${cacheStorage}`);
  }

  if (cacheStorage === 'upstash-redis') {
    config.cache = new UpstashRedisCache();
    // Other methods are already known by the gateway
  } else {
    config.cache = {
      type: cacheStorage as 'redis',
    };
  }
  console.log(`Using cache storage: ${cacheStorage}`);

  const VALID_CACHE_PLUGINS = ['HTTP Caching', 'Response Caching'];

  const cachePlugin = process.env.CACHE_PLUGIN;

  if (!cachePlugin) {
    throw new Error('CACHE_PLUGIN env var is required');
  }

  if (!VALID_CACHE_PLUGINS.includes(cachePlugin)) {
    throw new Error(`Invalid cache plugin: ${cachePlugin}`);
  }

  console.log(`Using cache plugin: ${cachePlugin}`);
  if (cachePlugin === 'HTTP Caching') {
    config.plugins = ctx => [useHTTPCache(ctx)];
  } else if (cachePlugin === 'Response Caching') {
    config.responseCaching = {
      session: () => null,
    };
  }
}

export const gatewayConfig = defineConfig(config);
