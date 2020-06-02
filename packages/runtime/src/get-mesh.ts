import { GraphQLSchema, execute, DocumentNode, GraphQLError } from 'graphql';
import { GraphQLOperation, ExecuteMeshFn, GetMeshOptions, Requester } from './types';
import { applySchemaTransformations, applyOutputTransformations, ensureDocumentNode } from './utils';
import { Hooks, KeyValueCache, RawSourceOutput } from '@graphql-mesh/types';

import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { applyResolversHooksToSchema } from './resolvers-hooks';
import { EventEmitter } from 'events';
import { MESH_CONTEXT_SYMBOL, MESH_API_CONTEXT_SYMBOL } from './constants';
import { addResolversToSchema } from '@graphql-tools/schema';

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
  const schemas: GraphQLSchema[] = [];
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

      if (apiSource.transforms && apiSource.transforms.length > 0) {
        apiSchema = await applySchemaTransformations(apiSource.name, apiSchema, apiSource.transforms, cache, hooks);
      }

      rawSources.push({
        name: apiSource.name,
        globalContextBuilder: source.contextBuilder || null,
        schema: apiSchema,
        context: apiSource.context || {},
        contextVariables: source.contextVariables || [],
        handler: apiSource.handlerLibrary,
      });

      schemas.push(apiSchema);
    })
  );
  let unifiedSchema = await options.merger({
    rawSources,
    cache,
    hooks,
    typeDefs: options.additionalTypeDefs,
    resolvers: options.additionalResolvers,
  });

  if (options.transforms && options.transforms.length > 0) {
    unifiedSchema = await applyOutputTransformations(unifiedSchema, options.transforms, cache, hooks);
  }

  hooks.emit('schemaReady', {
    schema: unifiedSchema,
    applyResolvers: modifiedResolvers => {
      if (modifiedResolvers) {
        unifiedSchema = addResolversToSchema({
          schema: unifiedSchema,
          resolvers: modifiedResolvers,
          updateResolversInPlace: true,
        });
      }
    },
  });

  unifiedSchema = applyResolversHooksToSchema(unifiedSchema, hooks);

  async function buildMeshContext(initialContextValue?: any) {
    const context: Record<string, any> = {
      ...(initialContextValue || {}),
      [MESH_CONTEXT_SYMBOL]: true,
    };

    await Promise.all(
      rawSources.map(async handlerRes => {
        let globalContext = {};

        const globalContextBuilder = handlerRes.globalContextBuilder;

        if (globalContextBuilder) {
          globalContext = await globalContextBuilder(initialContextValue);
        }

        if (globalContext) {
          Object.assign(context, globalContext);
        }

        const apiName = handlerRes.name;

        if (handlerRes.context) {
          Object.assign(context, {
            [apiName]: {
              config: handlerRes.context || {},
            },
          });
        }

        context[apiName] = context[apiName] || {};
        context[apiName].schema = handlerRes.schema;
        context[apiName][MESH_API_CONTEXT_SYMBOL] = true;
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
