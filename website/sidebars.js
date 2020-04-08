module.exports = {
  sidebar: {
    'Getting Started': [
      'getting-started/introduction',
      'getting-started/installation',
      'getting-started/basic-example',
      'getting-started/mesh-transforms',
      'getting-started/multiple-apis'
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
      'handlers/thrift'
    ],
    Transforms: [
      'transforms/rename',
      'transforms/prefix',
      'transforms/extend',
      'transforms/cache',
      'transforms/snapshot',
      'transforms/mock'
    ],
    'API Reference': ['api/cli', 'api/runtime'],
    Recipes: ['recipes/typescript', 'recipes/as-sdk', 'recipes/as-gateway'],
    'Extend Your Mesh': ['extend/custom-handler', 'extend/custom-transform']
  }
};
