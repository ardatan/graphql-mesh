import { defineConfig, useHttpCache } from '@graphql-hive/gateway';

const config: ReturnType<typeof defineConfig> = {
  cache: {
    type: 'localforage',
  },
};

if (process.env.HTTP_CACHE) {
  config.plugins = ctx => [useHttpCache(ctx)];
}

if (process.env.RESPONSE_CACHE) {
  config.responseCaching = {
    session: () => null,
    ttlPerType: {
      Comment: 5_000,
    },
  };
}

export const gatewayConfig = defineConfig(config);
