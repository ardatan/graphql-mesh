import { GraphQLSchema, execute, DocumentNode, parse } from 'graphql';
import { mergeSchemas } from '@graphql-toolkit/schema-merging';
import { GraphQLOperation, ExecuteMeshFn, GetMeshOptions } from './types'

export async function getMesh(
  options: GetMeshOptions
): Promise<{
  execute: ExecuteMeshFn;
  schema: GraphQLSchema;
}> {
  const results: Record<string, { sdk: any; schema: GraphQLSchema }> = {};

  for (const apiSource of options.sources) {
    const handlerResult = await apiSource.handler.getMeshSource({
      name: apiSource.name,
      filePathOrUrl: apiSource.source
    });

    let apiSchema = handlerResult.schema;
    // TODO: Apply transformations over `apiSchema`

    results[apiSource.name] = {
      sdk: handlerResult.sdk,
      schema: apiSchema
    };
  }

  let unifiedSchema = mergeSchemas({
    schemas: Object.keys(results).map(key => results[key].schema)
  });

  // TODO: Do tranformations on unified schema
  // TODO: Apply custom resolvers over the unified schema
  // TOOD: Make sure graphql-compose knows how to preserve the resolve function
  // when modifying the schema with it.
  async function meshExecute<TData = any, TVariables = any>(
    document: GraphQLOperation,
    variables: TVariables
  ): Promise<TData | null | undefined> {
    const r = await execute<TData>({
      document: ensureDocumentNode(document),
      contextValue: {}, // TODO: Build real context with SDK from all sources, just to make sure custom resolver are able to access it
      rootValue: {},
      variableValues: variables,
      schema: unifiedSchema
    });

    return r.data;
  }

  return {
    // TODO: Do we need to return SDKs here as well? to make it acessible outside GraphQL context?
    execute: meshExecute,
    schema: unifiedSchema,
  };
}

function ensureDocumentNode(document: GraphQLOperation): DocumentNode {
  return typeof document === 'string' ? parse(document) : document;
}
