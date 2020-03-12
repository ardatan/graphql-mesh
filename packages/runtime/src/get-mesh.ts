import { writeFileSync } from 'fs';
import { GraphQLSchema, execute, printSchema } from 'graphql';
import { mergeSchemas } from '@graphql-toolkit/schema-merging';
import { GraphQLOperation, ExecuteMeshFn, GetMeshOptions } from './types';
import {
  extractSdkFromResolvers,
  applySchemaTransformations,
  applyOutputTransformations,
  ensureDocumentNode
} from './utils';
import { MeshHandlerLibrary, Hooks } from '@graphql-mesh/types';
import { addResolveFunctionsToSchema } from 'graphql-tools-fork';

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

export async function getMesh(
  options: GetMeshOptions
): Promise<{
  execute: ExecuteMeshFn;
  schema: GraphQLSchema;
  rawSources: RawSourcesOutput;
  contextBuilder: () => Record<string, any>;
}> {
  const results: RawSourcesOutput = {};
  const hooks = new Hooks();

  for (const apiSource of options.sources) {
    const source = await apiSource.handler.getMeshSource({
      name: apiSource.name,
      filePathOrUrl: apiSource.source,
      config: apiSource.config,
      hooks
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
      sdk: extractSdkFromResolvers([
        apiSchema.getQueryType(),
        apiSchema.getMutationType(),
        apiSchema.getSubscriptionType()
      ]),
      schema: apiSchema,
      context: apiSource.context || {},
      contextVariables: source.contextVariables || [],
      handler: apiSource.handler
    };
  }

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

  async function meshExecute<TData = any, TVariables = any, TContext = any, TRootValue = any>(
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
        ...context,
      },
      rootValue: rootValue || {},
      variableValues: variables,
      schema: unifiedSchema
    });
  }

  return {
    execute: meshExecute,
    schema: unifiedSchema,
    contextBuilder: buildMeshContext,
    rawSources: results
  };
}
