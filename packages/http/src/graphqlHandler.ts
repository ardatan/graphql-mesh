import { MeshInstance } from '@graphql-mesh/runtime';
import { CORSOptions, createYoga, useLogger } from 'graphql-yoga';

export const graphqlHandler = (
  mesh$: Promise<MeshInstance>,
  playgroundTitle: string,
  playgroundEnabled: boolean,
  graphqlEndpoint: string,
  corsConfig: CORSOptions
) => {
  const yoga$ = mesh$.then(mesh =>
    createYoga({
      parserCache: false,
      validationCache: false,
      plugins: [
        ...mesh.plugins,
        useLogger({
          skipIntrospection: true,
          logFn: (eventName, { args }) => {
            if (eventName.endsWith('-start')) {
              mesh.logger.debug(`\t headers: `, args.contextValue.headers);
            }
          },
        }),
      ],
      logging: mesh.logger,
      maskedErrors: false,
      graphiql: playgroundEnabled && {
        title: playgroundTitle,
      },
      cors: corsConfig,
      graphqlEndpoint,
    })
  );
  return async (request: Request, ...args: any[]) => {
    const yoga = await yoga$;
    return yoga.handleRequest(request, ...args);
  };
};
