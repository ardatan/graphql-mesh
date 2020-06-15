/* eslint-disable no-unused-expressions */
import { GraphQLSchema, execute, DocumentNode, GraphQLError, subscribe } from 'graphql';
import {
  GraphQLOperation,
  ExecuteMeshFn,
  GetMeshOptions,
  Requester,
  ResolvedTransform,
  SubscribeMeshFn,
  MeshContext,
} from './types';
import { ensureDocumentNode } from './utils';
import { Hooks, KeyValueCache, RawSourceOutput, MeshTransform } from '@graphql-mesh/types';

import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { applyResolversHooksToSchema } from './resolvers-hooks';
import { EventEmitter } from 'events';
import { MESH_CONTEXT_SYMBOL, MESH_API_CONTEXT_SYMBOL } from './constants';
import { applySchemaTransforms } from '@graphql-tools/utils';

export function groupTransforms({
  transforms,
  apiName,
  cache,
  hooks,
}: {
  transforms: ResolvedTransform[];
  apiName: string;
  cache: KeyValueCache;
  hooks: Hooks;
}) {
  const wrapTransforms: MeshTransform[] = [];
  const noWrapTransforms: MeshTransform[] = [];
  transforms?.forEach(({ transformLibrary: TransformCtor, config }) => {
    const transform = new TransformCtor({
      apiName,
      config,
      cache,
      hooks,
    });
    if (transform.noWrap) {
      noWrapTransforms.push(transform);
    } else {
      wrapTransforms.push(transform);
    }
  });
  return { wrapTransforms, noWrapTransforms };
}

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

      let apiSchema = source.schema;

      const apiName = apiSource.name;

      const { wrapTransforms, noWrapTransforms } = groupTransforms({
        transforms: apiSource.transforms,
        apiName,
        cache,
        hooks,
      });

      apiSchema = applySchemaTransforms(apiSchema, noWrapTransforms);

      rawSources.push({
        name: apiName,
        contextBuilder: source.contextBuilder || null,
        schema: apiSchema,
        executor: source.executor,
        subscriber: source.subscriber,
        transforms: wrapTransforms,
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
      ({ transformLibrary: TransformCtor, config }) =>
        new TransformCtor({
          config,
          cache,
          hooks,
        })
    ),
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
          const sourceContext = await contextBuilder(initialContextValue);
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

  const localRequester: Requester = async <R, V>(document: DocumentNode, variables: V, context: any) => {
    const executionResult = await meshExecute<V>(document, variables, context);

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
