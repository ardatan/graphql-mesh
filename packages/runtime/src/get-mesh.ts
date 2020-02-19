import { GraphQLSchema, execute, DocumentNode, parse } from 'graphql';
import { mergeSchemas } from '@graphql-toolkit/schema-merging';
import { GraphQLOperation, ExecuteMeshFn, GetMeshOptions } from './types';

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
    // TODO: Apply transformations over `apiSchema`

    results[apiSource.name] = {
      sdk: handlerResult.sdk,
      schema: apiSchema,
      context: apiSource.context || {}
    };
  }

  let unifiedSchema = mergeSchemas({
    schemas: Object.keys(results).map(key => results[key].schema)
  });

  function buildMeshContext(): Record<string, any> {
    const context = Object.keys(results).reduce((prev, apiName) => {
      return {
        ...prev,
        [apiName]: results[apiName].context
      };
    }, {});

    return context;
  }

  // TODO: Do tranformations on unified schema
  // TODO: Apply custom resolvers over the unified schema
  // TOOD: Make sure graphql-compose knows how to preserve the resolve function
  // when modifying the schema with it.
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
