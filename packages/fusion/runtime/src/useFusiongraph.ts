import {
  buildASTSchema,
  buildSchema,
  DocumentNode,
  GraphQLSchema,
  isSchema,
  printSchema,
} from 'graphql';
import { Plugin, PromiseOrValue, useReadinessCheck, YogaServer } from 'graphql-yoga';
import { getInContextSDK } from '@graphql-mesh/runtime';
import { TransportBaseContext } from '@graphql-mesh/transport-common';
import { OnDelegateHook } from '@graphql-mesh/types';
import { mapMaybePromise, resolveAdditionalResolversWithoutImport } from '@graphql-mesh/utils';
import {
  DelegationPlanInfo,
  delegationPlanInfosByContext,
  isDelegationDebugging,
  logFnForContext,
  SubschemaConfig,
} from '@graphql-tools/delegate';
import { stitchSchemas } from '@graphql-tools/stitch';
import { IResolvers, isAsyncIterable, isDocumentNode, isPromise } from '@graphql-tools/utils';
import { extractSubgraphsFromFusiongraph } from './getSubschemasFromFusiongraph.js';
import {
  defaultTransportsOption,
  FusiongraphPlugin,
  getOnSubgraphExecute,
  TransportsOption,
} from './utils.js';

export interface FusiongraphPluginOptions<TContext> {
  getFusiongraph(
    baseCtx: TransportBaseContext,
  ): GraphQLSchema | DocumentNode | string | Promise<GraphQLSchema | string | DocumentNode>;
  transports?: TransportsOption;
  polling?: number;
  additionalTypedefs?: DocumentNode | string | DocumentNode[] | string[];
  additionalResolvers?: IResolvers<unknown, TContext> | IResolvers<unknown, TContext>[];
  transportBaseContext?: TransportBaseContext;
  readinessCheckEndpoint?: string;
}

function ensureSchema(source: GraphQLSchema | DocumentNode | string) {
  if (isSchema(source)) {
    return source;
  }
  if (typeof source === 'string') {
    return buildSchema(source, { assumeValid: true, assumeValidSDL: true });
  }
  if (isDocumentNode(source)) {
    return buildASTSchema(source, { assumeValid: true, assumeValidSDL: true });
  }
  return source;
}

export function useFusiongraph<TContext extends Record<string, any> = Record<string, any>>(
  opts: FusiongraphPluginOptions<TContext>,
): Plugin<TContext> & {
  invalidateUnifiedGraph(): void;
} {
  let fusiongraph: GraphQLSchema;
  let lastLoadedFusiongraph: string | GraphQLSchema | DocumentNode;
  let yoga: YogaServer<unknown, TContext>;
  // TODO: We need to figure this out in a better way
  let inContextSDK: any;
  function handleLoadedFusiongraph(loadedFusiongraph: string | GraphQLSchema | DocumentNode) {
    if (loadedFusiongraph != null && lastLoadedFusiongraph === loadedFusiongraph) {
      return;
    }
    lastLoadedFusiongraph = loadedFusiongraph;
    fusiongraph = ensureSchema(loadedFusiongraph);
    const { transportEntryMap, subschemaMap, additionalTypeDefs, additionalResolversFromTypeDefs } =
      extractSubgraphsFromFusiongraph(fusiongraph);
    const subgraphMap = new Map<string, GraphQLSchema>();
    const subschemas: SubschemaConfig[] = [];
    const onSubgraphExecute = getOnSubgraphExecute({
      fusiongraph,
      plugins: yoga.getEnveloped._plugins as FusiongraphPlugin[],
      transports: opts.transports || defaultTransportsOption,
      transportBaseContext: opts.transportBaseContext,
      transportEntryMap,
      subgraphMap,
    });
    for (const [subschemaName, subschemaConfig] of subschemaMap) {
      subgraphMap.set(subschemaName, subschemaConfig.schema);
      subschemas.push({
        ...subschemaConfig,
        name: subschemaName,
        executor(execReq) {
          return onSubgraphExecute(subschemaName, execReq);
        },
      } as SubschemaConfig);
    }
    fusiongraph = stitchSchemas({
      subschemas,
      assumeValid: true,
      assumeValidSDL: true,
      typeDefs: [opts.additionalTypedefs, ...additionalTypeDefs],
      resolvers: [
        opts.additionalResolvers as any,
        additionalResolversFromTypeDefs.map(additionalResolver =>
          resolveAdditionalResolversWithoutImport(additionalResolver),
        ),
      ] as any,
    });
    if (opts.additionalResolvers || additionalResolversFromTypeDefs.length) {
      const onDelegateHooks: OnDelegateHook<TContext>[] = [];
      for (const plugin of yoga.getEnveloped._plugins as any[]) {
        if (plugin.onDelegate) {
          onDelegateHooks.push(plugin.onDelegate);
        }
      }
      inContextSDK = getInContextSDK(
        fusiongraph,
        subschemas as any[],
        opts.transportBaseContext?.logger,
        onDelegateHooks,
      );
    }
  }
  function getAndSetFusiongraph(): PromiseOrValue<void> {
    const supergraph$ = opts.getFusiongraph(opts.transportBaseContext);
    return mapMaybePromise(supergraph$, handleLoadedFusiongraph) as PromiseOrValue<void>;
  }
  if (opts.polling) {
    setInterval(getAndSetFusiongraph, opts.polling);
  }
  let initialFusiongraph$: PromiseOrValue<void>;
  let initiated = false;
  function ensureFusiongraph() {
    if (!initiated) {
      initialFusiongraph$ = getAndSetFusiongraph();
    }
    initiated = true;
    return initialFusiongraph$;
  }
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
              const initialFusiongraph$ = ensureFusiongraph();
              if (isPromise(initialFusiongraph$)) {
                return initialFusiongraph$.then(() => !!fusiongraph);
              }
              return !!fusiongraph;
            },
          }) as any,
        );
      }
    },
    onRequestParse() {
      return {
        onRequestParseDone() {
          return ensureFusiongraph();
        },
      };
    },
    onExecute({ args }) {
      if (isDelegationDebugging()) {
        logFnForContext.set(args.contextValue, (...args: any[]) =>
          opts.transportBaseContext?.logger?.debug(args),
        );

        return {
          onExecuteDone({ result }) {
            if (isAsyncIterable(result)) {
              opts.transportBaseContext?.logger?.warn(
                'Delegation result is an AsyncIterable. This is not supported by the delegation logger.',
              );
              return;
            }
            const delegationPlanInfos = delegationPlanInfosByContext.get(args.contextValue);
            if (delegationPlanInfos) {
              result.extensions = result.extensions || {};
              const delegationPlans = (result.extensions.delegationPlans ||=
                []) as DelegationPlanInfo[];
              delegationPlans.push(...delegationPlanInfos);
            }
          },
        };
      }
    },
    onEnveloped({ setSchema }: { setSchema: (schema: GraphQLSchema) => void }) {
      setSchema(fusiongraph);
    },
    onContextBuilding({ extendContext }) {
      const initialFusiongraph$ = ensureFusiongraph();
      function handleInitiatedFusiongraph() {
        if (inContextSDK) {
          extendContext(inContextSDK);
        }
        extendContext(opts.transportBaseContext as any);
      }
      if (isPromise(initialFusiongraph$)) {
        return initialFusiongraph$.then(handleInitiatedFusiongraph);
      }
      handleInitiatedFusiongraph();
    },
    invalidateUnifiedGraph() {
      return getAndSetFusiongraph();
    },
  };
}
