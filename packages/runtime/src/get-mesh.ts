import { GraphQLSchema, execute, DocumentNode, GraphQLError } from 'graphql';
import { mergeSchemas } from '@graphql-toolkit/schema-merging';
import { GraphQLOperation, ExecuteMeshFn, GetMeshOptions } from './types';
import {
  extractSdkFromResolvers,
  applySchemaTransformations,
  applyOutputTransformations,
  ensureDocumentNode
} from './utils';
import { MeshHandlerLibrary, Hooks, KeyValueCache } from '@graphql-mesh/types';
import { addResolveFunctionsToSchema } from 'graphql-tools-fork';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru'

export type Requester<C = {}> = <R, V>(
  doc: DocumentNode,
  vars?: V,
  options?: C
) => Promise<R>;

export type RawSourcesOutput = Record<
  string,
  {
    // TOOD: Remove globalContextBuilder and use hooks for that
    globalContextBuilder: null | ((initialContextValue?: any) => Promise<any>);
    sdk: Record<string, any>;
    schema: GraphQLSchema;
    context: Record<string, any>;
    contextVariables: string[];
    handler: MeshHandlerLibrary;
  }
>;

export async function getMesh(
  options: GetMeshOptions
): Promise<{
  execute: ExecuteMeshFn;
  schema: GraphQLSchema;
  rawSources: RawSourcesOutput;
  sdkRequester: Requester;
  contextBuilder: (initialContextValue?: any) => Promise<Record<string, any>>;
  cache?: KeyValueCache;
}> {
  const results: RawSourcesOutput = {};
  const hooks = new Hooks();

  await Promise.all(options.sources.map(async apiSource => {
    const source = await apiSource.handler.getMeshSource({
      name: apiSource.name,
      filePathOrUrl: apiSource.source,
      config: apiSource.config,
      hooks,
      cache: options.cache || new InMemoryLRUCache(),
    });

    let apiSchema = source.schema;

    if (apiSource.transformations && apiSource.transformations.length > 0) {
      apiSchema = await applySchemaTransformations(
        apiSource.name,
        apiSchema,
        apiSource.transformations
      );
    }

    results[apiSource.name] = {
      globalContextBuilder: source.contextBuilder || null,
      sdk: extractSdkFromResolvers(apiSchema, hooks, [
        apiSchema.getQueryType(),
        apiSchema.getMutationType(),
        apiSchema.getSubscriptionType()
      ]),
      schema: apiSchema,
      context: apiSource.context || {},
      contextVariables: source.contextVariables || [],
      handler: apiSource.handler
    };
  }));

  const schemas = Object.keys(results).map(key => results[key].schema);

  let unifiedSchema = mergeSchemas({
    schemas
  });

  if (options.transformations && options.transformations.length > 0) {
    unifiedSchema = await applyOutputTransformations(
      unifiedSchema,
      options.transformations
    );
  }

  if (options.additionalResolvers) {
    unifiedSchema = addResolveFunctionsToSchema({
      resolvers: options.additionalResolvers,
      schema: unifiedSchema
    });
  }

  hooks.emit('schemaReady', unifiedSchema);

  async function buildMeshContext(initialContextValue?: any): Promise<Record<string, any>> {
    const context: Record<string, any> = {
      ...(initialContextValue || {}),
    };
    
    await Promise.all(
      Object.keys(results).map(async apiName => {
        let globalContext = {};

        const handlerRes = results[apiName];

        const globalContextBuilder = handlerRes.globalContextBuilder;

        if (globalContextBuilder) {
          globalContext = await globalContextBuilder(initialContextValue);
        }

        if (globalContext) {
          Object.assign(context, globalContext);
        }

        if (handlerRes.context) {
          Object.assign(context, {
            [apiName]: {
              config: handlerRes.context || {}
            }
          });
        }

        if (handlerRes.sdk) {
          if (typeof handlerRes.sdk === 'function') {
            context[apiName].api = handlerRes.sdk(context);
          } else if (typeof handlerRes.sdk === 'object') {
            context[apiName].api = handlerRes.sdk;
          }
        }
      })
    );

    return context;
  }

  async function meshExecute<
    TData = any,
    TVariables = any,
    TContext = any,
    TRootValue = any
  >(
    document: GraphQLOperation,
    variables: TVariables,
    context?: TContext,
    rootValue?: TRootValue
  ) {
    const contextValue = await buildMeshContext(context);

    return execute<TData>({
      document: ensureDocumentNode(document),
      contextValue,
      rootValue: rootValue || {},
      variableValues: variables,
      schema: unifiedSchema
    });
  }

  const localRequester: Requester = async <R, V>(
    document: DocumentNode,
    variables: V
  ) => {
    const executionResult = await meshExecute<R, V>(document, variables, {});

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
    rawSources: results,
    sdkRequester: localRequester,
  };
}

export class GraphQLMeshSdkError<Data = {}, Variables = {}> extends Error {
  constructor(
    public errors: ReadonlyArray<GraphQLError>,
    public document: DocumentNode,
    public variables: Variables,
    public data: Data
  ) {
    super(
      `GraphQL Mesh SDK Failed (\${errors.length} errors): \${errors.map(e => e.message).join('\\n\\t')}`
    );
  }
}
