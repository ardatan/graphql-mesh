import { CORSOptions, createYoga, useLogger } from 'graphql-yoga';
import { MeshInstance } from '@graphql-mesh/runtime';
import { memoize1 } from '@graphql-tools/utils';

export const graphqlHandler = ({
  getBuiltMesh,
  playgroundTitle,
  playgroundEnabled,
  graphqlEndpoint,
  corsConfig,
  batchingLimit,
  healthCheckEndpoint = '/healthcheck',
}: {
  getBuiltMesh: () => Promise<MeshInstance>;
  playgroundTitle: string;
  playgroundEnabled: boolean;
  graphqlEndpoint: string;
  corsConfig: CORSOptions;
  batchingLimit?: number;
  healthCheckEndpoint?: string;
}) => {
  const getYogaForMesh = memoize1(function getYogaForMesh(mesh: MeshInstance) {
    return createYoga({
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
      batching: batchingLimit ? { limit: batchingLimit } : false,
      healthCheckEndpoint,
    });
  });
  return (request: Request, ctx: any) =>
    getBuiltMesh().then(mesh => getYogaForMesh(mesh).handleRequest(request, ctx));
};
