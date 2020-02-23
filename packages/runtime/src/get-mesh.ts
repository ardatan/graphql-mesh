import { GraphQLSchema, execute, DocumentNode, parse } from 'graphql';
import { mergeSchemas } from '@graphql-toolkit/schema-merging';
import { GraphQLOperation, ExecuteMeshFn, GetMeshOptions } from './types';
import {
  applySchemaTransformations,
  applyOutputTransformations
} from './utils';
import { MeshSource, MeshHandlerLibrary } from '@graphql-mesh/types';
import { addResolveFunctionsToSchema } from 'graphql-tools-fork';

export type RawSourcesOutput = Record<
  string,
  {
    sdk: MeshSource['sdk'];
    schema: GraphQLSchema;
    context: Record<string, any>;
    meshSourcePayload: any;
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

  for (const apiSource of options.sources) {
    const { payload, source } = await apiSource.handler.getMeshSource({
      name: apiSource.name,
      filePathOrUrl: apiSource.source,
      config: apiSource.config
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
      sdk: source.sdk,
      schema: apiSchema,
      context: apiSource.context || {},
      meshSourcePayload: payload,
      handler: apiSource.handler
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
    const context: Record<string, any> = Object.keys(results).reduce(
      (prev, apiName) => {
        return {
          ...prev,
          [apiName]: {
            config: results[apiName].context || {}
          }
        };
      },
      {}
    );

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
    contextBuilder: buildMeshContext,
    rawSources: results
  };
}

function ensureDocumentNode(document: GraphQLOperation): DocumentNode {
  return typeof document === 'string' ? parse(document) : document;
}
