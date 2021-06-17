module.exports = {
  sidebar: {
    'Getting Started': [
      'getting-started/introduction',
      'getting-started/installation',
      'getting-started/basic-example',
      'getting-started/mesh-transforms',
      'getting-started/multiple-apis',
    ],
    'Input Handlers': [
      'handlers/available-handlers',
      'handlers/graphql',
      'handlers/openapi',
      'handlers/grpc',
      'handlers/json-schema',
      'handlers/postgraphile',
      'handlers/soap',
      'handlers/mongoose',
      'handlers/odata',
      'handlers/thrift',
      'handlers/tuql',
      'handlers/mysql',
      'handlers/neo4j',
    ],
    Transforms: [
      'transforms/rename',
      'transforms/prefix',
      'transforms/encapsulate',
      'transforms/cache',
      'transforms/snapshot',
      'transforms/mock',
      'transforms/resolvers-composition',
      'transforms/federation',
      'transforms/filter-schema',
      'transforms/naming-convention',
      'transforms/extend',
    ],
    Cache: [
      'cache/inmemory-lru',
      'cache/cache-file',
      'cache/localforage',
      'cache/cache-redis'
    ],
    Recipes: [
      'recipes/typescript',
      'recipes/as-sdk',
      'recipes/as-gateway',
      'recipes/federation',
      'recipes/introspection-cache',
      'recipes/subscriptions-webhooks',
      'recipes/live-queries'
    ],
    "API Reference": require('./api-sidebar.json')
    // 'Extend Your Mesh': ['extend/custom-handler', 'extend/custom-transform']
  },
};
