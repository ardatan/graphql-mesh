import type { CORSOptions } from 'graphql-yoga';
import { createYoga } from 'graphql-yoga';
import { createGatewayRuntime, type GatewayRuntime } from '@graphql-hive/gateway-runtime';
import { handleFederationSupergraph } from '@graphql-mesh/fusion-runtime';
import type { MeshInstance } from '@graphql-mesh/runtime';
import { memoize1, type Executor } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

type UnderthehoodOnSubgraphExecute = (
  subgraphName: string,
  executionRequest: Parameters<Executor>[0],
) => ReturnType<Executor>;

export const graphqlHandler = ({
  getBuiltMesh,
  playgroundTitle,
  playgroundEnabled,
  playgroundOffline,
  graphqlEndpoint,
  corsConfig,
  batchingLimit,
  healthCheckEndpoint = '/healthcheck',
  extraParamNames,
  renderGraphiQL: renderGraphiQLFn,
}: {
  getBuiltMesh: () => Promise<MeshInstance>;
  playgroundTitle: string;
  playgroundEnabled: boolean;
  playgroundOffline?: boolean;
  graphqlEndpoint: string;
  corsConfig: CORSOptions;
  batchingLimit?: number;
  healthCheckEndpoint?: string;
  extraParamNames?: string[];
  renderGraphiQL?: (options?: any) => string | Promise<string>;
}) => {
  const getYogaForMesh = memoize1(function getYogaForMesh(mesh: MeshInstance) {
    const supergraphSdl = (mesh.schema.extensions as { supergraphSdl?: string } | undefined)
      ?.supergraphSdl;
    const onSubgraphExecute = (
      mesh.schema.extensions as { onSubgraphExecute?: UnderthehoodOnSubgraphExecute } | undefined
    )?.onSubgraphExecute;

    // Under the hood: when underthehood compose produced a Supergraph, serve via
    // Hive Gateway. Public entry remains createMeshHTTPHandler (CLI serve unchanged).
    // Skip Gateway when root transforms changed the executable field set after compose
    // — Gateway would still serve the pre-transform Supergraph SDL.
    const skipUnderthehoodGateway = Boolean(
      (mesh.schema.extensions as { skipUnderthehoodGateway?: boolean } | undefined)
        ?.skipUnderthehoodGateway,
    );
    if (typeof supergraphSdl === 'string' && supergraphSdl.length > 0 && !skipUnderthehoodGateway) {
      const gateway = createGatewayRuntime({
        supergraph: supergraphSdl,
        logging: mesh.log,
        maskedErrors: false,
        graphiql: playgroundEnabled && {
          title: playgroundTitle,
        },
        cors: corsConfig,
        graphqlEndpoint,
        landingPage: false,
        batching: batchingLimit ? { limit: batchingLimit } : false,
        healthCheckEndpoint,
        // Preserve Mesh plugins (context hooks, user plugins). Gateway owns schema
        // planning; useSchema/useEngine from getMesh stay harmless alongside that.
        plugins: () => [...mesh.plugins] as any,
        ...(playgroundEnabled && playgroundOffline
          ? {
              renderGraphiQL: requireOfflineRenderGraphiQL(renderGraphiQLFn),
            }
          : {}),
        ...(typeof onSubgraphExecute === 'function'
          ? {
              unifiedGraphHandler(opts) {
                return handleFederationSupergraph({
                  ...opts,
                  onSubgraphExecute,
                  log: mesh.log,
                });
              },
            }
          : {}),
      });
      mesh.deferDispose(() =>
        handleMaybePromise(
          () => (gateway as AsyncDisposable)[Symbol.asyncDispose](),
          () => undefined,
        ),
      );
      return gateway as GatewayRuntime;
    }

    const yogaOptions: Parameters<typeof createYoga>[0] = {
      plugins: [...mesh.plugins],
      extraParamNames,
      logging: mesh.log,
      // whatwg-node fetch no longer re-exports `crypto`; platform crypto is required
      // for request-id generation and digest helpers still reading `fetchAPI.crypto`.
      fetchAPI: {
        crypto: globalThis.crypto,
      } as any,
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
    };

    if (playgroundEnabled && playgroundOffline) {
      yogaOptions.renderGraphiQL = requireOfflineRenderGraphiQL(renderGraphiQLFn);
    }

    const yoga = createYoga(yogaOptions);
    // Dispose Yoga instance when the Mesh instance is destroyed
    mesh.deferDispose(() =>
      handleMaybePromise(
        () => yoga.dispose(),
        () => undefined,
      ),
    );
    return yoga;
  });
  return (request: Request, ctx: any) =>
    getBuiltMesh().then(mesh => getYogaForMesh(mesh).handleRequest(request, ctx));
};

function requireOfflineRenderGraphiQL(
  renderGraphiQLFn?: (options?: any) => string | Promise<string>,
) {
  if (!renderGraphiQLFn) {
    throw new Error(
      'serve.playground.offline is enabled but renderGraphiQL was not provided. Import `renderGraphiQL` from `@graphql-yoga/render-graphiql` and pass it to createMeshHTTPHandler (generated Mesh artifacts do this automatically).',
    );
  }
  return renderGraphiQLFn;
}
