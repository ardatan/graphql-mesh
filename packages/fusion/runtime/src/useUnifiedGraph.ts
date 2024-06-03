import {
  buildASTSchema,
  buildSchema,
  DocumentNode,
  GraphQLSchema,
  isSchema,
  specifiedRules,
  validate,
} from 'graphql';
import { envelop, PromiseOrValue, useReadinessCheck, type Plugin } from 'graphql-yoga';
import { useEngine } from '@envelop/core';
import { getInContextSDK } from '@graphql-mesh/runtime';
import { TransportBaseContext, TransportEntry } from '@graphql-mesh/transport-common';
import { OnDelegateHook } from '@graphql-mesh/types';
import {
  mapMaybePromise,
  parseWithCache,
  resolveAdditionalResolversWithoutImport,
} from '@graphql-mesh/utils';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { stitchSchemas } from '@graphql-tools/stitch';
import {
  ExecutionResult,
  IResolvers,
  isAsyncIterable,
  isDocumentNode,
  isPromise,
  mapAsyncIterator,
  mapSchema,
  MaybeAsyncIterable,
  MaybePromise,
  pruneSchema,
  TypeSource,
} from '@graphql-tools/utils';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { filterHiddenPartsInSchema } from './filterHiddenPartsInSchema.js';
import { extractSubgraphsFromFusiongraph } from './getSubschemasFromFusiongraph.js';
import {
  compareSchemas,
  getOnSubgraphExecute,
  TransportsOption,
  UnifiedGraphPlugin,
} from './utils.js';

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

export interface GetExecutableSchemaFromFusiongraphOptions<TContext extends Record<string, any>> {
  additionalTypeDefs?: DocumentNode | string | DocumentNode[] | string[];
  additionalResolvers?: IResolvers<unknown, TContext> | IResolvers<unknown, TContext>[];
  transportBaseContext?: TransportBaseContext;
}

export type UnifiedGraphHandler = (opts: UnifiedGraphHandlerOpts) => UnifiedGraphHandlerResult;

export interface UnifiedGraphHandlerOpts {
  unifiedGraph: GraphQLSchema;
  additionalTypeDefs?: TypeSource;
  additionalResolvers?: IResolvers<unknown, any> | IResolvers<unknown, any>[];
  onSubgraphExecute: ReturnType<typeof getOnSubgraphExecute>;
}

export interface UnifiedGraphHandlerResult {
  unifiedGraph: GraphQLSchema;
  transportEntryMap: Record<string, TransportEntry>;
  subschemas: SubschemaConfig[];
  additionalResolvers: IResolvers[];
}

export interface UnifiedGraphPluginOptions<TContext> {
  getUnifiedGraph(
    baseCtx: TransportBaseContext,
  ): MaybePromise<GraphQLSchema | string | DocumentNode>;
  // Handle the unified graph by any specification
  handleUnifiedGraph?: UnifiedGraphHandler;
  transports?: TransportsOption;
  polling?: number;
  additionalTypeDefs?: TypeSource;
  additionalResolvers?: IResolvers<unknown, TContext> | IResolvers<unknown, TContext>[];
  transportBaseContext?: TransportBaseContext;
  readinessCheckEndpoint?: string;
}

export type EnvelopUnifiedGraphOpts<TContext> = UnifiedGraphPluginOptions<TContext> & {
  plugins?: (Plugin & UnifiedGraphPlugin)[];
};

export function envelopUnifiedGraph<TContext extends Record<string, any> = Record<string, any>>(
  opts: EnvelopUnifiedGraphOpts<TContext>,
) {
  return envelop({
    plugins: [
      useEngine({
        execute: normalizedExecutor,
        validate,
        parse: parseWithCache,
        specifiedRules,
      }),
      useUnifiedGraph(opts),
      ...(opts.plugins || []),
    ],
  });
}

export function getExecutorForUnifiedGraph<TContext extends Record<string, any>>(
  opts: EnvelopUnifiedGraphOpts<TContext>,
) {
  const getEnveloped = envelopUnifiedGraph(opts);
  return function unifiedGraphExecutor<TResult = any, TVariables = {}>(executorOpts: {
    query: TypedDocumentNode<TResult, TVariables> | string;
    variables?: TVariables;
    context?: unknown;
  }): MaybePromise<MaybeAsyncIterable<TResult>> {
    const { parse, validate, contextFactory, execute, schema } = getEnveloped(executorOpts.context);
    const document =
      typeof executorOpts.query === 'string' ? parse(executorOpts.query) : executorOpts.query;

    if (schema) {
      const validationErrors = validate(schema, document);
      if (validationErrors.length) {
        if (validationErrors.length === 1) {
          throw validationErrors[0];
        } else {
          throw new AggregateError(
            validationErrors,
            validationErrors.map(err => err.message).join('\n'),
          );
        }
      }
    }

    // TODO: We need to figure this out in a better way
    return mapMaybePromise((contextFactory as any)(), context => {
      const executionResult$ = execute({
        document,
        schema,
        variableValues: executorOpts.variables,
        contextValue: context,
      });
      return mapMaybePromise(
        executionResult$,
        (executionResult: MaybeAsyncIterable<ExecutionResult>) => {
          function handleSingleResult(result: ExecutionResult) {
            if (result.errors) {
              if (result.errors.length === 1) {
                throw result.errors[0];
              }
              throw new AggregateError(result.errors, 'Multiple errors occurred');
            }
            return result.data;
          }
          if (isAsyncIterable(executionResult)) {
            const iterator = executionResult[Symbol.asyncIterator]();
            return mapAsyncIterator(iterator, handleSingleResult);
          }
          return handleSingleResult(executionResult);
        },
      );
    });
  };
}

export const handleFusiongraph: UnifiedGraphHandler = function handleFusiongraph(opts) {
  const { subschemas, transportEntryMap, additionalTypeDefs, additionalResolvers } =
    extractSubgraphsFromFusiongraph(opts.unifiedGraph, function (subschemaConfig) {
      subschemaConfig.executor = function executor(execReq) {
        return opts.onSubgraphExecute(subschemaConfig.name, execReq);
      };
    });
  const unifiedGraph = pruneSchema(
    filterHiddenPartsInSchema(
      stitchSchemas({
        subschemas,
        assumeValid: true,
        assumeValidSDL: true,
        typeDefs: [opts.additionalTypeDefs, ...additionalTypeDefs],
        resolvers: [opts.additionalResolvers as any, ...additionalResolvers],
      }),
    ),
  );

  return {
    unifiedGraph,
    transportEntryMap,
    subschemas,
    additionalTypeDefs,
    additionalResolvers,
  };
};

export function useUnifiedGraph<TContext extends Record<string, any> = Record<string, any>>(
  opts: UnifiedGraphPluginOptions<TContext>,
): Plugin<TContext> & {
  invalidateUnifiedGraph(): void;
} {
  let unifiedGraph: GraphQLSchema;
  let lastLoadedUnifiedGraph: string | GraphQLSchema | DocumentNode;
  let plugins: (Plugin & UnifiedGraphPlugin)[];
  // TODO: We need to figure this out in a better way
  let inContextSDK;
  const handleUnifiedGraph = opts.handleUnifiedGraph || handleFusiongraph;
  let currentTimeout: NodeJS.Timeout | undefined;
  function pausePolling() {
    if (currentTimeout) {
      clearTimeout(currentTimeout);
      currentTimeout = undefined;
    }
  }
  function continuePolling() {
    if (opts.polling) {
      currentTimeout = setTimeout(() => {
        currentTimeout = undefined;
        return getAndSetUnifiedGraph();
      }, opts.polling);
    }
  }
  function getAndSetUnifiedGraph() {
    pausePolling();
    return mapMaybePromise(
      opts.getUnifiedGraph(opts.transportBaseContext),
      function handleLoadedUnifiedGraph(loadedUnifiedGraph: string | GraphQLSchema | DocumentNode) {
        if (
          loadedUnifiedGraph != null &&
          lastLoadedUnifiedGraph != null &&
          compareSchemas(loadedUnifiedGraph, lastLoadedUnifiedGraph)
        ) {
          opts.transportBaseContext?.logger?.debug('Unified Graph has not changed, skipping...');
          continuePolling();
          return;
        }
        if (lastLoadedUnifiedGraph != null) {
          opts.transportBaseContext?.logger?.debug('Unified Graph changed, updating...');
        }
        lastLoadedUnifiedGraph ||= loadedUnifiedGraph;
        lastLoadedUnifiedGraph = loadedUnifiedGraph;
        unifiedGraph = ensureSchema(loadedUnifiedGraph);
        const {
          unifiedGraph: newUnifiedGraph,
          transportEntryMap,
          subschemas,
          additionalResolvers,
        } = handleUnifiedGraph({
          unifiedGraph,
          additionalTypeDefs: opts.additionalTypeDefs,
          additionalResolvers: opts.additionalResolvers,
          onSubgraphExecute(subgraphName, execReq) {
            return onSubgraphExecute(subgraphName, execReq);
          },
        });
        unifiedGraph = newUnifiedGraph;
        const onSubgraphExecute = getOnSubgraphExecute({
          plugins,
          transports: opts.transports,
          transportBaseContext: opts.transportBaseContext,
          transportEntryMap,
          getSubgraphSchema(subgraphName) {
            const subgraph = subschemas.find(s => s.name === subgraphName);
            if (!subgraph) {
              throw new Error(`Subgraph ${subgraphName} not found`);
            }
            return subgraph.schema;
          },
        });
        if (opts.additionalResolvers || additionalResolvers.length) {
          const onDelegateHooks: OnDelegateHook<TContext>[] = [];
          for (const plugin of plugins as any[]) {
            if (plugin.onDelegate) {
              onDelegateHooks.push(plugin.onDelegate);
            }
          }
          inContextSDK = getInContextSDK(
            unifiedGraph,
            // @ts-expect-error Legacy Mesh RawSource is not compatible with new Mesh
            subschemas,
            opts.transportBaseContext?.logger,
            onDelegateHooks,
          );
        }
        continuePolling();
      },
    );
  }
  let initialUnifiedGraph$: MaybePromise<void>;
  let initiated = false;
  function ensureUnifiedGraph() {
    if (!initiated) {
      initialUnifiedGraph$ = getAndSetUnifiedGraph();
    }
    initiated = true;
    return initialUnifiedGraph$;
  }
  return {
    onPluginInit({ addPlugin, plugins: allPlugins, setSchema }) {
      // @ts-expect-error Plugin types are not compatible
      plugins = allPlugins;
      if (opts.readinessCheckEndpoint) {
        addPlugin(
          // @ts-expect-error fix useReadinessCheck typings to inherit the context
          useReadinessCheck({
            endpoint: opts.readinessCheckEndpoint,
            // @ts-expect-error PromiseLike does not match Promise
            check: () => mapMaybePromise(ensureUnifiedGraph(), () => !!unifiedGraph),
          }),
        );
      }
      if (unifiedGraph) {
        setSchema(unifiedGraph);
      }
    },
    // @ts-expect-error PromiseLike and Promise conflicts
    onRequestParse() {
      return {
        onRequestParseDone() {
          return ensureUnifiedGraph();
        },
      };
    },
    onEnveloped({ setSchema }: { setSchema: (schema: GraphQLSchema) => void }) {
      setSchema(unifiedGraph);
    },
    // @ts-expect-error PromiseLike and Promise conflicts
    onExecute({ args }) {
      return mapMaybePromise(ensureUnifiedGraph(), () => {
        args.schema ||= unifiedGraph;
      });
    },
    // @ts-expect-error PromiseLike and Promise conflicts
    onContextBuilding({ extendContext }) {
      return mapMaybePromise(ensureUnifiedGraph(), () => {
        if (inContextSDK) {
          extendContext(inContextSDK);
        }
        // @ts-expect-error TransportBaseContext is part of the context
        extendContext(opts.transportBaseContext);
      });
    },
    invalidateUnifiedGraph() {
      return getAndSetUnifiedGraph();
    },
  };
}
