import { GraphQLSchema, execute, DocumentNode, parse } from 'graphql';
import { mergeSchemas } from '@graphql-toolkit/schema-merging';
import { GraphQLOperation, ExecuteMeshFn, GetMeshOptions } from './types';
import {
  applySchemaTransformations,
  applyOutputTransformations
} from './utils';
import { addResolveFunctionsToSchema } from 'graphql-tools-fork';

export async function getMesh(
  options: GetMeshOptions
): Promise<{
  execute: ExecuteMeshFn;
  schema: GraphQLSchema;
  contextBuilder: () => Record<string, any>;
}> {
  const results: Record<
    string,
    { sdk: any; schema: GraphQLSchema; context: Record<string, any> }
  > = {};

  for (const apiSource of options.sources) {
    const handlerResult = await apiSource.handler.getMeshSource({
      name: apiSource.name,
      filePathOrUrl: apiSource.source,
      config: apiSource.config
    });

    let apiSchema = handlerResult.schema;

    if (apiSource.transformations && apiSource.transformations.length > 0) {
      apiSchema = await applySchemaTransformations(
        apiSource.name,
        apiSchema,
        apiSource.transformations
      );
    }

    results[apiSource.name] = {
      sdk: handlerResult.sdk,
      schema: apiSchema,
      context: apiSource.context || {}
    };
  }

  let unifiedSchema = mergeSchemas({
    schemas: Object.keys(results).map(key => results[key].schema)
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

  function buildMeshContext(): Record<string, any> {
    const context = Object.keys(results).reduce((prev, apiName) => {
      return {
        ...prev,
        [apiName]: results[apiName].context
      };
    }, {});

    return context;
  }

  async function meshExecute<TData = any, TVariables = any>(
    document: GraphQLOperation,
    variables: TVariables
  ): Promise<TData | null | undefined> {
    const context = buildMeshContext();
    const r = await execute<TData>({
      document: ensureDocumentNode(document),
      contextValue: context,
      rootValue: {},
      variableValues: variables,
      schema: unifiedSchema
    });

    return r.data;
  }

  return {
    execute: meshExecute,
    schema: unifiedSchema,
    contextBuilder: buildMeshContext
  };
}

function ensureDocumentNode(document: GraphQLOperation): DocumentNode {
  return typeof document === 'string' ? parse(document) : document;
}
