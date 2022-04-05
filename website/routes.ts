import { IRoutes, GenerateRoutes } from '@guild-docs/server';
import apiSidebar from './api-sidebar.json';

export function getRoutes(): IRoutes {
  const Routes: IRoutes = {
    _: {
      introduction: {
        $name: 'Introduction',
      },
      'getting-started': {
        $name: 'Getting Started',
        $routes: [
          'overview',
          'installation',
          'your-first-mesh-gateway',
          'combine-multiple-sources',
          'sources-with-no-definition',
          'comparison',
        ],
      },
      // guides: {
      //   $name: 'Guides',
      //   $routes: [
      //     'extending-unified-schema',
      //     'graphql-code-generator'
      //   ],
      // },
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
        $name: 'Transforms',
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
        $name: 'Cache',
        $routes: ['inmemory-lru', 'file', 'localforage', 'redis'],
      },
      api: apiSidebar,
      'cli-commands': {
        $name: 'CLI commands',
      },
    },
  };

  GenerateRoutes({
    Routes,
    folderPattern: 'docs',
    ignorePaths: ['extend', 'generated-markdown', 'recipes', 'guides'],
  });

  return {
    _: Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Object.entries(Routes._).map(([key, value]) => [`docs/${key}`, value])
    ),
  };
}
