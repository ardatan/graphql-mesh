import { GraphQLSchema } from 'graphql';
import { Plugin } from 'graphql-yoga';
import {
  createTransportGetter,
  defaultTransportsOption,
  Transport,
  TransportEntry,
  TransportExecutorFactoryFn,
  TransportsOption,
} from '@graphql-mesh/fusion-runtime';
import { getStitchedSchemaFromSupergraphSdl } from '@graphql-tools/federation';
import {
  createGraphQLError,
  Executor,
  getDocumentNodeFromSchema,
  isPromise,
} from '@graphql-tools/utils';
import { handleSupergraphConfig } from './handleSupergraphConfig.js';
import { MeshServeContext, UnifiedGraphConfig } from './types.js';

export interface FederationSupergraphPluginOpts {
  serveContext: MeshServeContext;
  supergraphConfig: UnifiedGraphConfig;
  transports: TransportsOption;
}

export function useFederationSupergraph({
  serveContext,
  supergraphConfig,
  transports = defaultTransportsOption,
}: FederationSupergraphPluginOpts): Plugin & { invalidateUnifiedGraph(): void } {
  const transportsGetter = createTransportGetter(transports);
  let supergraph: GraphQLSchema;
  // eslint-disable-next-line no-inner-declarations
  function getAndSetSupergraph(): Promise<void> | void {
    const newSupergraph$ = handleSupergraphConfig(supergraphConfig, serveContext);
    function handleSupergraphSchema(newSupergraph: GraphQLSchema) {
      supergraph = getStitchedSchemaFromSupergraphSdl({
        supergraphSdl: getDocumentNodeFromSchema(newSupergraph),
        onExecutor({ subgraphName, endpoint, subgraphSchema }) {
          const transportEntry: TransportEntry = {
            kind: 'http',
            location: endpoint,
            subgraph: subgraphName,
            headers: {},
            options: {},
          };
          const transportExecutorFactoryOpts = {
            ...serveContext,
            getSubgraph() {
              return subgraphSchema;
            },
            transportEntry,
            subgraphName,
          };
          function handleImportResult(importRes: Transport): Executor {
            const getSubgraphExecutor: TransportExecutorFactoryFn = importRes.getSubgraphExecutor;
            if (!getSubgraphExecutor) {
              throw createGraphQLError(
                `getSubgraphExecutor is not exported from the transport: ${transportEntry.kind}`,
              );
            }
            const executor$ = getSubgraphExecutor(transportExecutorFactoryOpts);
            if (isPromise(executor$)) {
              return function lazyExecutor(execReq) {
                return executor$.then(executor => executor(execReq));
              };
            }
            return executor$;
          }
          serveContext.logger.info(
            `Loading transport "${transportEntry?.kind}" for subgraph "${subgraphName}"`,
          );
          const importRes$ = transportsGetter(transportEntry.kind);
          if (isPromise(importRes$)) {
            const executor$ = importRes$.then(handleImportResult);
            return function lazyExecutor(execReq) {
              return executor$.then(executor => executor(execReq));
            };
          }
          return handleImportResult(importRes$);
        },
      });
    }
    if (isPromise(newSupergraph$)) {
      return newSupergraph$.then(handleSupergraphSchema).catch(e => {
        serveContext.logger.error(`Failed to load the new Supergraph: ${e.stack}`);
      });
    }
    handleSupergraphSchema(newSupergraph$);
  }
  let initialSupergraph$: Promise<void> | void;
  return {
    onRequestParse() {
      return {
        onRequestParseDone() {
          initialSupergraph$ ||= getAndSetSupergraph();
          return initialSupergraph$;
        },
      };
    },
    onEnveloped({ setSchema }: { setSchema: (schema: GraphQLSchema) => void }) {
      setSchema(supergraph);
    },
    onContextBuilding({ extendContext }) {
      extendContext(serveContext as any);
    },
    invalidateUnifiedGraph() {
      return getAndSetSupergraph();
    },
  };
}
