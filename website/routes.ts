import { IRoutes, GenerateRoutes } from '@guild-docs/server';
import apiSidebar from './api-sidebar.json';

export function getRoutes(): IRoutes {
  const Routes: IRoutes = {
    _: {
      docs: {
        _: {
          'getting-started': {
            $name: 'Getting Started',
            $routes: ['introduction', 'installation', 'basic-usage'],
          },
          recipes: {
            $routes: [
              'multiple-apis',
              'build-mesh-artifacts',
              'typescript',
              'as-sdk',
              'as-gateway',
              'custom-server',
              'subscriptions-webhooks',
              'live-queries',
            ],
          },
          handlers: {
            $name: 'Source Handlers',
            $routes: [
              'handlers-introduction',
              'graphql',
              'openapi',
              'grpc',
              'json-schema',
              'postgraphile',
              'soap',
              'mongoose',
              'odata',
              'thrift',
              'tuql',
              'mysql',
              'neo4j',
            ],
          },
          transforms: {
            $routes: [
              'transforms-introduction',
              'rename',
              'prefix',
              'encapsulate',
              'cache',
              'snapshot',
              'mock',
              'resolvers-composition',
              'filter-schema',
              'replace-field',
              'naming-convention',
              'type-merging',
              'federation',
              'extend',
            ],
          },
          cache: {
            $routes: ['inmemory-lru', 'file', 'localforage', 'redis'],
          },
          api: apiSidebar,
        },
      },
    },
  };

  GenerateRoutes({
    Routes,
    folderPattern: 'docs',
    basePath: 'docs',
    ignorePaths: ['extend', 'generated-markdown'],
  });

  return Routes;
}
