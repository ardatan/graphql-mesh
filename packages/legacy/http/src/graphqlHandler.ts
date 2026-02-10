import type { CORSOptions } from 'graphql-yoga';
import { createYoga, useLogger } from 'graphql-yoga';
import type { MeshInstance } from '@graphql-mesh/runtime';
import { memoize1 } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export const graphqlHandler = ({
  getBuiltMesh,
  playgroundTitle,
  playgroundEnabled,
  graphqlEndpoint,
  corsConfig,
  batchingLimit,
  healthCheckEndpoint = '/healthcheck',
  extraParamNames,
}: {
  getBuiltMesh: () => Promise<MeshInstance>;
  playgroundTitle: string;
  playgroundEnabled: boolean;
  graphqlEndpoint: string;
  corsConfig: CORSOptions;
  batchingLimit?: number;
  healthCheckEndpoint?: string;
  extraParamNames?: string[];
}) => {
  const getYogaForMesh = memoize1(function getYogaForMesh(mesh: MeshInstance) {
    const yoga = createYoga({
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
      extraParamNames,
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
      disposeOnProcessTerminate: true,
    });
    // Dispose Yoga instance when the Mesh instance is destroyed
    const id = mesh.pubsub.subscribe('destroy', () => {
      const unsubscribe = () => {
        return mesh.pubsub.unsubscribe(id);
      };
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handleMaybePromise(() => yoga.dispose(), unsubscribe, unsubscribe);
    });
    return yoga;
  });
  return (request: Request, ctx: any) =>
    getBuiltMesh().then(mesh => getYogaForMesh(mesh).handleRequest(request, ctx));
};
