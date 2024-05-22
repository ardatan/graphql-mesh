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
import { TransportBaseContext } from '@graphql-mesh/transport-common';
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
} from '@graphql-tools/utils';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { filterHiddenPartsInSchema } from './filterHiddenPartsInSchema.js';
import { extractSubgraphsFromFusiongraph } from './getSubschemasFromFusiongraph.js';
import {
  defaultTransportsOption,
  FusiongraphPlugin,
  getOnSubgraphExecute,
  TransportsOption,
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
  additionalTypedefs?: DocumentNode | string | DocumentNode[] | string[];
  additionalResolvers?: IResolvers<unknown, TContext> | IResolvers<unknown, TContext>[];
  transportBaseContext?: TransportBaseContext;
}

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

export type EnvelopFusiongraphOpts<TContext> = FusiongraphPluginOptions<TContext> & {
  plugins?: (Plugin & FusiongraphPlugin)[];
};

export function envelopFusiongraph<TContext extends Record<string, any> = Record<string, any>>(
  opts: EnvelopFusiongraphOpts<TContext>,
) {
  return envelop({
    plugins: [
      useEngine({
        execute: normalizedExecutor,
        validate,
        parse: parseWithCache,
        specifiedRules,
      }),
      useFusiongraph(opts),
      ...(opts.plugins || []),
    ],
  });
}

export function getExecutorForFusiongraph<TContext extends Record<string, any>>(
  opts: EnvelopFusiongraphOpts<TContext>,
) {
  const getEnveloped = envelopFusiongraph(opts);
  return function fusiongraphExecutor<TResult = any, TVariables = {}>(executorOpts: {
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

    // @ts-expect-error Somehow contextFactory typings are not correct
    return mapMaybePromise(contextFactory(), context => {
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

export function useFusiongraph<TContext extends Record<string, any> = Record<string, any>>(
  opts: FusiongraphPluginOptions<TContext>,
): Plugin<TContext> & {
  invalidateUnifiedGraph(): void;
} {
  let fusiongraph: GraphQLSchema;
  let lastLoadedFusiongraph: string | GraphQLSchema | DocumentNode;
  let plugins: (Plugin & FusiongraphPlugin)[];
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
      plugins,
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
    fusiongraph = filterHiddenPartsInSchema(fusiongraph);
    fusiongraph = pruneSchema(fusiongraph);
    if (opts.additionalResolvers || additionalResolversFromTypeDefs.length) {
      const onDelegateHooks: OnDelegateHook<TContext>[] = [];
      for (const plugin of plugins as any[]) {
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
    onPluginInit({ addPlugin, plugins: allPlugins }) {
      plugins = allPlugins as any;
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
    onEnveloped({ setSchema }: { setSchema: (schema: GraphQLSchema) => void }) {
      setSchema(fusiongraph);
    },
    // @ts-expect-error PromiseLike and Promise conflicts
    onExecute({ args }) {
      return mapMaybePromise(ensureFusiongraph(), () => {
        args.schema ||= fusiongraph;
      });
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
