import { GraphQLSchema, execute, DocumentNode, GraphQLError } from 'graphql';
import { GraphQLOperation, ExecuteMeshFn, GetMeshOptions, Requester } from './types';
import { ensureDocumentNode } from './utils';
import { Hooks, KeyValueCache, RawSourceOutput } from '@graphql-mesh/types';

import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { applyResolversHooksToSchema } from './resolvers-hooks';
import { EventEmitter } from 'events';
import { MESH_CONTEXT_SYMBOL, MESH_API_CONTEXT_SYMBOL } from './constants';

export async function getMesh(
  options: GetMeshOptions
): Promise<{
  execute: ExecuteMeshFn;
  schema: GraphQLSchema;
  rawSources: RawSourceOutput[];
  sdkRequester: Requester;
  contextBuilder: (initialContextValue?: any) => Promise<Record<string, any>>;
  destroy: () => void;
  hooks: Hooks;
  cache: KeyValueCache;
}> {
  const rawSources: RawSourceOutput[] = [];
  let hooks = options.hooks!;
  if (!hooks) {
    hooks = new EventEmitter({ captureRejections: true }) as Hooks;
    hooks.setMaxListeners(Infinity);
  }
  const cache = options.cache || new InMemoryLRUCache();

  await Promise.all(
    options.sources.map(async apiSource => {
      const source = await apiSource.handlerLibrary.getMeshSource({
        name: apiSource.name,
        config: apiSource.handlerConfig || {},
        hooks,
        cache,
      });

      const apiSchema = source.schema;

      const apiName = apiSource.name;
      rawSources.push({
        name: apiName,
        contextBuilder: source.contextBuilder || null,
        schema: apiSchema,
        executor: source.executor,
        subscriber: source.subscriber,
        transforms: apiSource.transforms.map(
          ({ transformCtor: TransformCtor, config }) =>
            new TransformCtor({
              apiName,
              config,
              cache,
              hooks,
            })
        ),
        contextVariables: source.contextVariables || [],
        handler: apiSource.handlerLibrary,
      });
    })
  );

  let unifiedSchema = await options.merger({
    rawSources,
    cache,
    hooks,
    typeDefs: options.additionalTypeDefs,
    resolvers: options.additionalResolvers,
    transforms: options.transforms.map(
      ({ transformCtor: TransformCtor, config }) =>
        new TransformCtor({
          config,
          cache,
          hooks,
        })
    ),
  });

  hooks.emit('schemaReady', unifiedSchema);

  unifiedSchema = applyResolversHooksToSchema(unifiedSchema, hooks);

  async function buildMeshContext(initialContextValue?: any) {
    const context: Record<string, any> = {
      ...(initialContextValue || {}),
      [MESH_CONTEXT_SYMBOL]: true,
    };

    await Promise.all(
      rawSources.map(async rawSource => {
        const contextBuilder = rawSource.contextBuilder;

        if (contextBuilder) {
          const sourceContext = await contextBuilder(initialContextValue);
          if (sourceContext) {
            Object.assign(context, sourceContext);
          }
        }

        context[rawSource.name] = {
          rawSource,
          [MESH_API_CONTEXT_SYMBOL]: true,
        };
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

  const localRequester: Requester = async <R, V>(document: DocumentNode, variables: V) => {
    const executionResult = await meshExecute<V>(document, variables, {});

    if (executionResult.data && !executionResult.errors) {
      return executionResult.data as R;
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
