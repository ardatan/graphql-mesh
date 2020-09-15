/* eslint-disable no-unused-expressions */
import { GraphQLSchema, execute, DocumentNode, GraphQLError, subscribe } from 'graphql';
import { ExecuteMeshFn, GetMeshOptions, Requester, SubscribeMeshFn, MeshContext } from './types';
import { Hooks, KeyValueCache, RawSourceOutput, GraphQLOperation } from '@graphql-mesh/types';

import { applyResolversHooksToSchema } from './resolvers-hooks';
import { MESH_CONTEXT_SYMBOL, MESH_API_CONTEXT_SYMBOL } from './constants';
import { applySchemaTransforms } from '@graphql-tools/utils';
import { ensureDocumentNode, groupTransforms } from '@graphql-mesh/utils';

export async function getMesh(
  options: GetMeshOptions
): Promise<{
  execute: ExecuteMeshFn;
  subscribe: SubscribeMeshFn;
  schema: GraphQLSchema;
  rawSources: RawSourceOutput[];
  sdkRequester: Requester;
  contextBuilder: (initialContextValue?: any) => Promise<Record<string, any>>;
  destroy: () => void;
  hooks: Hooks;
  cache: KeyValueCache;
}> {
  const rawSources: RawSourceOutput[] = [];
  const hooks = options.hooks;
  const cache = options.cache;

  await Promise.all(
    options.sources.map(async apiSource => {
      const source = await apiSource.handler.getMeshSource();

      let apiSchema = source.schema;

      const apiName = apiSource.name;

      const { wrapTransforms, noWrapTransforms } = groupTransforms(apiSource.transforms);

      apiSchema = applySchemaTransforms(apiSchema, noWrapTransforms);

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
      });
    })
  );

  let unifiedSchema = await options.merger({
    rawSources,
    cache,
    hooks,
    typeDefs: options.additionalTypeDefs,
    resolvers: options.additionalResolvers,
    transforms: options.transforms,
  });

  hooks.emit('schemaReady', unifiedSchema);

  unifiedSchema = applyResolversHooksToSchema(unifiedSchema, hooks);

  async function buildMeshContext<TAdditionalContext>(initialContextValue?: TAdditionalContext) {
    const context: MeshContext & TAdditionalContext = {
      ...initialContextValue,
      [MESH_CONTEXT_SYMBOL]: true,
    };

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

  async function meshExecute<TVariables = any, TContext = any, TRootValue = any>(
    document: GraphQLOperation,
    variables?: TVariables,
    context?: TContext,
    rootValue?: TRootValue
  ) {
    const contextValue = await buildMeshContext(context);

    return execute({
      document: ensureDocumentNode(document),
      contextValue,
      rootValue: rootValue || {},
      variableValues: variables || {},
      schema: unifiedSchema,
    });
  }

  async function meshSubscribe<TVariables = any, TContext = any, TRootValue = any>(
    document: GraphQLOperation,
    variables?: TVariables,
    context?: TContext,
    rootValue?: TRootValue
  ) {
    const contextValue = await buildMeshContext(context);

    return subscribe({
      document: ensureDocumentNode(document),
      contextValue,
      rootValue: rootValue || {},
      variableValues: variables || {},
      schema: unifiedSchema,
    });
  }

  const localRequester: Requester = async <Result, TVariables, TContext, TRootValue>(
    document: DocumentNode,
    variables: TVariables,
    context: TContext
  ) => {
    const executionResult = await meshExecute<TVariables, TContext, TRootValue>(document, variables, context);

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
  };

  return {
    execute: meshExecute,
    subscribe: meshSubscribe,
    schema: unifiedSchema,
    contextBuilder: buildMeshContext,
    rawSources,
    sdkRequester: localRequester,
    cache,
    hooks,
    destroy: () => hooks.emit('destroy'),
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
