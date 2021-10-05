import { IRoutes, GenerateRoutes } from '@guild-docs/server';

export function getRoutes(): IRoutes {
  const Routes: IRoutes = {
    _: {
      docs: {
        $name: 'Docs',
        $routes: ['getting_started', 'recipes', 'handlers', 'transforms', 'cache', 'api'],
        _: {
          getting_started: {

          }
        }

      },
    },
  };
  GenerateRoutes({
    Routes,
    folderPattern: 'docs',
    basePath: 'docs',
    basePathLabel: 'Documentation',
  });

  return Routes;
}
