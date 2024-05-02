import { DocumentNode, GraphQLSchema, isSchema, parse } from 'graphql';
import { Plugin, PromiseOrValue, useReadinessCheck, YogaServer } from 'graphql-yoga';
import {
  defaultTransportsOption,
  FusiongraphPlugin,
  getOnSubgraphExecute,
  TransportsOption,
} from '@graphql-mesh/fusion-runtime';
// eslint-disable-next-line import/no-extraneous-dependencies
import { getInContextSDK } from '@graphql-mesh/runtime';
import { TransportBaseContext, TransportEntry } from '@graphql-mesh/transport-common';
// eslint-disable-next-line import/no-extraneous-dependencies
import { OnDelegateHook } from '@graphql-mesh/types';
import { mapMaybePromise } from '@graphql-mesh/utils';
import { SubschemaConfig } from '@graphql-tools/delegate';
import {
  filterInternalFieldsAndTypes,
  getSubschemasFromSupergraphSdl,
} from '@graphql-tools/federation';
import { stitchSchemas } from '@graphql-tools/stitch';
import { getDocumentNodeFromSchema, IResolvers, isPromise } from '@graphql-tools/utils';

export interface FederationSupergraphPluginOptions<TContext> {
  getFederationSupergraph(
    baseCtx: TransportBaseContext,
  ): GraphQLSchema | DocumentNode | string | Promise<GraphQLSchema | string | DocumentNode>;
  transports?: TransportsOption;
  polling?: number;
  additionalTypedefs?: DocumentNode | string | DocumentNode[] | string[];
  additionalResolvers?: IResolvers<unknown, TContext> | IResolvers<unknown, TContext>[];
  transportBaseContext?: TransportBaseContext;
  readinessCheckEndpoint?: string;
}

function ensureSchemaAST(source: GraphQLSchema | DocumentNode | string) {
  if (isSchema(source)) {
    return getDocumentNodeFromSchema(source);
  }
  if (typeof source === 'string') {
    return parse(source, { noLocation: true });
  }
  return source;
}

export function useFederationSupergraph<TContext extends Record<string, any> = Record<string, any>>(
  opts: FederationSupergraphPluginOptions<TContext>,
): Plugin<TContext> & {
  invalidateUnifiedGraph(): void;
} {
  let supergraph: GraphQLSchema;
  let lastLoadedSupergraph: string | GraphQLSchema | DocumentNode;
  let yoga: YogaServer<unknown, TContext>;
  // TODO: We need to figure this out in a better way
  let inContextSDK: any;
  function handleLoadedSupergraph(loadedSupergraph: string | GraphQLSchema | DocumentNode) {
    if (loadedSupergraph != null && lastLoadedSupergraph === loadedSupergraph) {
      return;
    }
    lastLoadedSupergraph = loadedSupergraph;
    const schemaAST = ensureSchemaAST(loadedSupergraph);
    const transportEntryMap: Record<string, TransportEntry> = {};
    const subschemaMap = getSubschemasFromSupergraphSdl({
      supergraphSdl: schemaAST,
      batch: true,
      onExecutor({ subgraphName, endpoint }): any {
        transportEntryMap[subgraphName] = {
          subgraph: subgraphName,
          kind: 'http',
          location: endpoint,
        };
      },
    });
    const subschemas: SubschemaConfig[] = [];
    const subgraphMap: Map<string, GraphQLSchema> = new Map();
    const onSubgraphExecute = getOnSubgraphExecute({
      fusiongraph: supergraph,
      plugins: yoga.getEnveloped._plugins as FusiongraphPlugin[],
      transports: opts.transports || defaultTransportsOption,
      transportBaseContext: opts.transportBaseContext,
      transportEntryMap,
      subgraphMap,
    });
    for (const [subschemaName, subschemaConfig] of subschemaMap) {
      subschemas.push({
        ...subschemaConfig,
        executor(execReq) {
          return onSubgraphExecute(subschemaName, execReq);
        },
      });
      subgraphMap.set(subschemaName, subschemaConfig.schema);
    }
    supergraph = stitchSchemas({
      subschemas,
      assumeValid: true,
      assumeValidSDL: true,
      typeDefs: opts.additionalTypedefs,
      resolvers: opts.additionalResolvers as any,
    });
    supergraph = filterInternalFieldsAndTypes(supergraph);
    if (opts.additionalResolvers) {
      const onDelegateHooks: OnDelegateHook<TContext>[] = [];
      for (const plugin of yoga.getEnveloped._plugins as any[]) {
        if (plugin.onDelegate) {
          onDelegateHooks.push(plugin.onDelegate);
        }
      }
      inContextSDK = getInContextSDK(
        supergraph,
        subschemas as any[],
        opts.transportBaseContext?.logger,
        onDelegateHooks,
      );
    }
  }
  function getAndSetSupergraph(): PromiseOrValue<void> {
    const supergraph$ = opts.getFederationSupergraph(opts.transportBaseContext);
    return mapMaybePromise(supergraph$, handleLoadedSupergraph) as PromiseOrValue<void>;
  }
  if (opts.polling) {
    setInterval(getAndSetSupergraph, opts.polling);
  }
  let initialSupergraph$: PromiseOrValue<void>;
  let initiated = false;
  return {
    onYogaInit(payload) {
      yoga = payload.yoga;
    },
    onPluginInit({ addPlugin }) {
      if (opts.readinessCheckEndpoint) {
        addPlugin(
          // TODO: fix useReadinessCheck typings to inherit the context
          useReadinessCheck({
            endpoint: opts.readinessCheckEndpoint,
            check() {
              if (!initiated) {
                initialSupergraph$ = getAndSetSupergraph();
              }
              initiated = true;
              if (isPromise(initialSupergraph$)) {
                return initialSupergraph$.then(() => !!supergraph);
              }
              return !!supergraph;
            },
          }) as any,
        );
      }
    },
    onRequestParse() {
      return {
        onRequestParseDone() {
          if (!initiated) {
            initialSupergraph$ = getAndSetSupergraph();
          }
          initiated = true;
          return initialSupergraph$;
        },
      };
    },
    onEnveloped({ setSchema }: { setSchema: (schema: GraphQLSchema) => void }) {
      setSchema(supergraph);
    },
    onContextBuilding({ extendContext }) {
      if (inContextSDK) {
        extendContext(inContextSDK);
      }
      extendContext(opts.transportBaseContext as any);
    },
    invalidateUnifiedGraph() {
      return getAndSetSupergraph();
    },
  };
}
