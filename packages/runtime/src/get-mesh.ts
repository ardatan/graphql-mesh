import { GraphQLSchema, execute, DocumentNode, GraphQLError, isObjectType } from 'graphql';
import { mergeSchemasAsync } from '@graphql-toolkit/schema-merging';
import {
  GraphQLOperation,
  ExecuteMeshFn,
  GetMeshOptions,
  RawSourceOutput,
  Requester
} from './types';
import {
  extractSdkFromResolvers,
  applySchemaTransformations,
  applyOutputTransformations,
  ensureDocumentNode
} from './utils';
import { Hooks, KeyValueCache } from '@graphql-mesh/types';
import { addResolveFunctionsToSchema, IAddResolversToSchemaOptions } from 'graphql-tools-fork';
import { addResolversToSchema } from 'graphql-tools-fork';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import {
  applyResolversHooksToSchema, applyResolversHooksToResolvers
} from './resolvers-hooks';

function addResolversWithReferenceResolver(options: IAddResolversToSchemaOptions) {
  const schema = addResolveFunctionsToSchema(options);
  for (const typeName in options.resolvers) {
    for (const fieldName in options.resolvers[typeName]) {
      if (fieldName === '__resolveReference') {
        const type = schema.getType(typeName);
        if (isObjectType(type)) {
          (type as any).resolveReference = (options.resolvers[typeName] as any).__resolveReference;
        }
      }
    }
  }
  return schema;
}

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
  const hooks = options.hooks || new Hooks();
  const cache = options.cache || new InMemoryLRUCache();

  await Promise.all(
    options.sources.map(async apiSource => {
      const source = await apiSource.handlerLibrary.getMeshSource({
        name: apiSource.name,
        config: apiSource.handlerConfig || {},
        hooks,
        cache
      });

      let apiSchema = applyResolversHooksToSchema(source.schema, hooks);

      if (apiSource.transforms && apiSource.transforms.length > 0) {
        apiSchema = await applySchemaTransformations(
          apiSource.name,
          apiSchema,
          apiSource.transforms,
          cache,
          hooks
        );
      }

      rawSources.push({
        name: apiSource.name,
        globalContextBuilder: source.contextBuilder || null,
        sdk: await extractSdkFromResolvers(
          apiSchema,
          hooks, [
          apiSchema.getQueryType(),
          apiSchema.getMutationType(),
          apiSchema.getSubscriptionType()
        ],
          source.contextBuilder,
        ),
        schema: apiSchema,
        context: apiSource.context || {},
        contextVariables: source.contextVariables || [],
        handler: apiSource.handlerLibrary
      });

      schemas.push(apiSchema);
    })
  );

  let unifiedSchema = await mergeSchemasAsync({
    schemas
  });

  if (options.transforms && options.transforms.length > 0) {
    unifiedSchema = await applyOutputTransformations(
      unifiedSchema,
      options.transforms,
      cache,
      hooks
    );
  }

  if (options.additionalResolvers) {
    unifiedSchema = addResolversToSchema({
      resolvers: applyResolversHooksToResolvers(
        options.additionalResolvers,
        hooks
      ),
      schema: unifiedSchema
    });
  }

  hooks.emit('schemaReady', {
    schema: unifiedSchema,
    applyResolvers: modifiedResolvers => {
      if (modifiedResolvers) {
        unifiedSchema = addResolversToSchema(unifiedSchema, modifiedResolvers);
      }
    }
  });

  async function buildMeshContext(
    initialContextValue?: any
  ): Promise<Record<string, any>> {
    const context: Record<string, any> = {
      ...(initialContextValue || {}),
      __isMeshContext: true,
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
    rawSources,
    sdkRequester: localRequester,
    cache,
    hooks,
    destroy: () => {
      hooks.emit('destroy');
    }
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
      `GraphQL Mesh SDK Failed (${errors.length} errors): ${errors.map(e => e.message).join('\n\t')}`
    );
    errors.forEach(e => console.error(e));
  }
}
