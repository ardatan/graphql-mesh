import { GraphQLSchema, execute, DocumentNode, GraphQLError, isObjectType, GraphQLObjectType } from 'graphql';
import { mergeSchemas } from '@graphql-toolkit/schema-merging';
import { GraphQLOperation, ExecuteMeshFn, GetMeshOptions } from './types';
import {
  extractSdkFromResolvers,
  applySchemaTransformations,
  applyOutputTransformations,
  ensureDocumentNode
} from './utils';
import { MeshHandlerLibrary, Hooks } from '@graphql-mesh/types';
import { addResolveFunctionsToSchema, IAddResolversToSchemaOptions } from 'graphql-tools-fork';

export type Requester<C = {}> = <R, V>(
  doc: DocumentNode,
  vars?: V,
  options?: C
) => Promise<R>;

export type RawSourcesOutput = Record<
  string,
  {
    // TOOD: Remove globalContextBuilder and use hooks for that
    globalContextBuilder: null | (() => Promise<any>);
    sdk: Record<string, any>;
    schema: GraphQLSchema;
    context: Record<string, any>;
    contextVariables: string[];
    handler: MeshHandlerLibrary;
  }
>;

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
  rawSources: RawSourcesOutput;
  sdkRequester: Requester;
  contextBuilder: () => Promise<Record<string, any>>;
}> {
  const results: RawSourcesOutput = {};
  const hooks = new Hooks();

  for (const apiSource of options.sources) {
    const source = await apiSource.handlerLibrary.getMeshSource({
      name: apiSource.name,
      config: apiSource.handlerConfig || {},
      hooks
    });

    let apiSchema = source.schema;

    if (apiSource.transforms && apiSource.transforms.length > 0) {
      apiSchema = await applySchemaTransformations(
        apiSource.name,
        apiSchema,
        apiSource.transforms
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
      handler: apiSource.handlerLibrary
    };
  }

  const schemas = Object.keys(results).map(key => results[key].schema);

  let unifiedSchema = mergeSchemas({
    schemas
  });

  if (options.transforms && options.transforms.length > 0) {
    unifiedSchema = await applyOutputTransformations(
      unifiedSchema,
      options.transforms
    );
  }

  if (options.additionalResolvers) {
    unifiedSchema = addResolversWithReferenceResolver({
      resolvers: options.additionalResolvers,
      schema: unifiedSchema
    });
  }

  hooks.emit('schemaReady', unifiedSchema);

  async function buildMeshContext(): Promise<Record<string, any>> {
    const childContextObjects = await Promise.all(
      Object.keys(results).map(async apiName => {
        let globalContext = {};
        const globalContextBuilder = results[apiName].globalContextBuilder;

        if (globalContextBuilder) {
          globalContext = await globalContextBuilder();
        }

        return {
          ...(globalContext || {}),
          [apiName]: {
            config: results[apiName].context || {}
          }
        };
      }, {})
    );

    const context: Record<string, any> = childContextObjects
      .filter(Boolean)
      .reduce((prev, obj) => {
        return {
          ...prev,
          ...obj
        };
      }, {});

    Object.keys(results).forEach(apiName => {
      const handlerRes = results[apiName];

      if (handlerRes.sdk) {
        if (typeof handlerRes.sdk === 'function') {
          context[apiName].api = handlerRes.sdk(context);
        } else if (typeof handlerRes.sdk === 'object') {
          context[apiName].api = handlerRes.sdk;
        }
      }
    }, {});

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
    const meshContext = await buildMeshContext();

    return execute<TData>({
      document: ensureDocumentNode(document),
      contextValue: {
        ...meshContext,
        ...context
      },
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
    sdkRequester: localRequester
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
