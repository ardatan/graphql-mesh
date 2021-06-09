/* eslint-disable no-unused-expressions */
import { GraphQLSchema, DocumentNode, GraphQLError, subscribe, ExecutionArgs } from 'graphql';
import { ExecuteMeshFn, GetMeshOptions, Requester, SubscribeMeshFn } from './types';
import { MeshPubSub, KeyValueCache, RawSourceOutput, GraphQLOperation } from '@graphql-mesh/types';

import { applyResolversHooksToSchema } from './resolvers-hooks';
import { MESH_CONTEXT_SYMBOL, MESH_API_CONTEXT_SYMBOL } from './constants';
import {
  applySchemaTransforms,
  ensureDocumentNode,
  getInterpolatedStringFactory,
  groupTransforms,
  ResolverDataBasedFactory,
  jitExecutorFactory,
} from '@graphql-mesh/utils';

import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';

export interface MeshInstance {
  execute: ExecuteMeshFn;
  subscribe: SubscribeMeshFn;
  schema: GraphQLSchema;
  rawSources: RawSourceOutput[];
  sdkRequester: Requester;
  contextBuilder: (initialContextValue?: any) => Promise<Record<string, any>>;
  destroy: () => void;
  pubsub: MeshPubSub;
  cache: KeyValueCache;
  liveQueryStore: InMemoryLiveQueryStore;
}

export async function getMesh(options: GetMeshOptions): Promise<MeshInstance> {
  const rawSources: RawSourceOutput[] = [];
  const { pubsub, cache } = options;

  await Promise.all(
    options.sources.map(async apiSource => {
      const source = await apiSource.handler.getMeshSource();

      let apiSchema = source.schema;

      const apiName = apiSource.name;

      const { wrapTransforms, noWrapTransforms } = groupTransforms(apiSource.transforms);

      if (noWrapTransforms?.length) {
        apiSchema = applySchemaTransforms(apiSchema, { schema: apiSchema }, null, noWrapTransforms);
      }

      rawSources.push({
        name: apiName,
        contextBuilder: source.contextBuilder || null,
        schema: apiSchema,
        executor: source.executor,
        subscriber: source.subscriber,
        transforms: wrapTransforms,
        contextVariables: source.contextVariables || [],
        handler: apiSource.handler,
        batch: 'batch' in source ? source.batch : true,
        merge: apiSource.merge,
      });
    })
  );

  let unifiedSchema = await options.merger({
    rawSources,
    cache,
    pubsub,
    typeDefs: options.additionalTypeDefs,
    resolvers: options.additionalResolvers,
    transforms: options.transforms,
  });

  unifiedSchema = applyResolversHooksToSchema(unifiedSchema, pubsub);

  const jitExecutor = jitExecutorFactory(unifiedSchema, 'unified');

  const liveQueryStore = new InMemoryLiveQueryStore({
    includeIdentifierExtension: true,
    execute: (args: any) => {
      const { document, contextValue, variableValues, rootValue, operationName }: ExecutionArgs = args;
      return jitExecutor(
        {
          document,
          context: contextValue,
          variables: variableValues,
        },
        operationName,
        rootValue
      );
    },
  });

  const liveQueryInvalidationFactoryMap = new Map<string, ResolverDataBasedFactory<string>[]>();

  options.liveQueryInvalidations?.forEach(liveQueryInvalidation => {
    const rawInvalidationPaths = liveQueryInvalidation.invalidate;
    const factories = rawInvalidationPaths.map(rawInvalidationPath =>
      getInterpolatedStringFactory(rawInvalidationPath)
    );
    liveQueryInvalidationFactoryMap.set(liveQueryInvalidation.field, factories);
  });

  pubsub.subscribe('resolverDone', ({ result, resolverData }) => {
    const path = `${resolverData.info.parentType.name}.${resolverData.info.fieldName}`;
    if (liveQueryInvalidationFactoryMap.has(path)) {
      const invalidationPathFactories = liveQueryInvalidationFactoryMap.get(path);
      const invalidationPaths = invalidationPathFactories.map(invalidationPathFactory =>
        invalidationPathFactory({ ...resolverData, result })
      );
      liveQueryStore.invalidate(invalidationPaths);
    }
  });

  async function buildMeshContext<TAdditionalContext, TContext extends TAdditionalContext = any>(
    additionalContext: TAdditionalContext = {} as any
  ): Promise<TContext> {
    const context: TContext = Object.assign(additionalContext as any, {
      pubsub,
      cache,
      liveQueryStore,
      [MESH_CONTEXT_SYMBOL]: true,
    });

    await Promise.all(
      rawSources.map(async rawSource => {
        const contextBuilder = rawSource.contextBuilder;

        if (contextBuilder) {
          const sourceContext = await contextBuilder(context);
          if (sourceContext) {
            Object.assign(context, sourceContext);
          }
        }

        Object.assign(context, {
          [rawSource.name]: {
            rawSource,
            [MESH_API_CONTEXT_SYMBOL]: true,
          },
        });
      })
    );

    return context;
  }

  async function meshExecute<TVariables = any, TContext = any, TRootValue = any, TData = any>(
    document: GraphQLOperation<TData, TVariables>,
    variables?: TVariables,
    context?: TContext,
    rootValue?: TRootValue,
    operationName?: string
  ) {
    const contextValue = context && context[MESH_CONTEXT_SYMBOL] ? context : await buildMeshContext(context);

    return liveQueryStore.execute({
      document: ensureDocumentNode(document),
      contextValue,
      rootValue: rootValue || {},
      variableValues: variables || {},
      schema: unifiedSchema,
      operationName,
    });
  }

  async function meshSubscribe<TVariables = any, TContext = any, TRootValue = any, TData = any>(
    document: GraphQLOperation<TData, TVariables>,
    variables?: TVariables,
    context?: TContext,
    rootValue?: TRootValue,
    operationName?: string
  ) {
    const contextValue = context && context[MESH_CONTEXT_SYMBOL] ? context : await buildMeshContext(context);

    return subscribe({
      document: ensureDocumentNode(document),
      contextValue,
      rootValue: rootValue || {},
      variableValues: variables || {},
      schema: unifiedSchema,
      operationName,
    });
  }

  const localRequester: Requester = async <Result, TVariables, TContext, TRootValue>(
    document: DocumentNode,
    variables: TVariables,
    contextValue?: TContext,
    rootValue?: TRootValue,
    operationName?: string
  ) => {
    const executionResult = await meshExecute<TVariables, TContext, TRootValue>(
      document,
      variables,
      contextValue,
      rootValue,
      operationName
    );

    if ('data' in executionResult) {
      if (executionResult.data && !executionResult.errors) {
        return executionResult.data as Result;
      } else {
        throw new GraphQLMeshSdkError(
          executionResult.errors as ReadonlyArray<GraphQLError>,
          document,
          variables,
          executionResult.data
        );
      }
    } else {
      throw new Error('Not implemented');
    }
  };

  return {
    execute: meshExecute,
    subscribe: meshSubscribe,
    schema: unifiedSchema,
    contextBuilder: buildMeshContext,
    rawSources,
    sdkRequester: localRequester,
    cache,
    pubsub,
    destroy: () => pubsub.publish('destroy', undefined),
    liveQueryStore,
  };
}

export class GraphQLMeshSdkError<Data = any, Variables = any> extends Error {
  constructor(
    public errors: ReadonlyArray<GraphQLError>,
    public document: DocumentNode,
    public variables: Variables,
    public data: Data
  ) {
    super(`GraphQL Mesh SDK Failed (${errors.length} errors): ${errors.map(e => e.message).join('\n\t')}`);
    errors.forEach(e => console.error(e));
  }
}
