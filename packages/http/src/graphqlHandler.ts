import { CORSOptions, createYoga, useLogger } from 'graphql-yoga';
import { MeshInstance } from '@graphql-mesh/runtime';

export const graphqlHandler = (
  getBuiltMesh: () => Promise<MeshInstance>,
  playgroundTitle: string,
  playgroundEnabled: boolean,
  graphqlEndpoint: string,
  corsConfig: CORSOptions,
) => {
  let yoga$: Promise<ReturnType<typeof createYoga>>;
  return (request: Request, ctx: any) => {
    if (!yoga$) {
      yoga$ = getBuiltMesh().then(mesh =>
        createYoga({
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
          landingPage: false,
        }),
      );
    }
    return yoga$.then(yoga => yoga.handleRequest(request, ctx));
  };
};
