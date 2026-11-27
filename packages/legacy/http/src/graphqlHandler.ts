import type { CORSOptions, Plugin } from 'graphql-yoga';
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
  const getRuntimeForMesh = memoize1(function getRuntimeForMesh(mesh: MeshInstance) {
    const supergraphSdl = (mesh.schema.extensions as { supergraphSdl?: string } | undefined)
      ?.supergraphSdl;
    const onSubgraphExecute = (
      mesh.schema.extensions as { onSubgraphExecute?: UnderthehoodOnSubgraphExecute } | undefined
    )?.onSubgraphExecute;

    // Skip Supergraph planning when root transforms / additionalTypeDefs|Resolvers
    // changed the executable field set after compose — serve mesh.schema instead.
    const skipUnderthehoodGateway = Boolean(
      (mesh.schema.extensions as { skipUnderthehoodGateway?: boolean } | undefined)
        ?.skipUnderthehoodGateway,
    );
    const useSupergraph =
      typeof supergraphSdl === 'string' && supergraphSdl.length > 0 && !skipUnderthehoodGateway;

    const gateway = createGatewayRuntime({
      // Supergraph SDL when underthehood compose matches the served field set;
      // otherwise pass the executable Mesh schema and short-circuit planning.
      supergraph: useSupergraph ? supergraphSdl : mesh.schema,
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
      fetchAPI: {
        crypto: globalThis.crypto,
      } as any,
      // Preserve Mesh plugins (context hooks, user plugins).
      plugins: () =>
        [
          ...(extraParamNames?.length ? [useAllowExtraParamNames(extraParamNames)] : []),
          ...mesh.plugins,
        ] as any,
      ...(playgroundEnabled && playgroundOffline
        ? {
            renderGraphiQL: requireOfflineRenderGraphiQL(renderGraphiQLFn),
          }
        : {}),
      ...(useSupergraph && typeof onSubgraphExecute === 'function'
        ? {
            unifiedGraphHandler(opts) {
              return handleFederationSupergraph({
                ...opts,
                onSubgraphExecute,
                log: mesh.log,
              });
            },
          }
        : !useSupergraph
          ? {
              // Executable Mesh schema path (former createYoga fallback).
              unifiedGraphHandler() {
                return {
                  unifiedGraph: mesh.schema,
                  getSubgraphSchema: () => mesh.schema,
                };
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
  });
  return (request: Request, ctx: any) =>
    getBuiltMesh().then(mesh => getRuntimeForMesh(mesh).handleRequest(request, ctx));
};

/**
 * Hive Gateway's Yoga does not expose `extraParamNames`. Strip allow-listed
 * extras during parse so the built-in param check does not reject them
 * (same UX as createYoga({ extraParamNames })).
 */
function useAllowExtraParamNames(extraParamNames: string[]): Plugin {
  return {
    onRequestParse() {
      return {
        onRequestParseDone({ requestParserResult, setRequestParserResult }) {
          if (
            requestParserResult == null ||
            typeof requestParserResult !== 'object' ||
            Array.isArray(requestParserResult)
          ) {
            return;
          }
          const next = { ...requestParserResult };
          let changed = false;
          for (const name of extraParamNames) {
            if (Object.prototype.hasOwnProperty.call(next, name)) {
              delete next[name];
              changed = true;
            }
          }
          if (changed) {
            setRequestParserResult(next);
          }
        },
      };
    },
  };
}

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
