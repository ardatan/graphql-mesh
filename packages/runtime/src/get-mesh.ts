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
    globalContextBuilder: null | (() => Promise<any>);
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
      globalContextBuilder: source.contextBuilder || null,
      sdk: source.sdk,
      schema: apiSchema,
      context: apiSource.context || {},
      meshSourcePayload: payload,
      handler: apiSource.handler
    };
  }

  let unifiedSchema = results['Geo'].schema

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

    console.log('context: ', context);

    return context;
  }

  async function meshExecute<TData = any, TVariables = any>(
    document: GraphQLOperation,
    variables: TVariables
  ) {
    const context = await buildMeshContext();
    
    return execute<TData>({
      document: ensureDocumentNode(document),
      contextValue: context,
      rootValue: {},
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

function ensureDocumentNode(document: GraphQLOperation): DocumentNode {
  return typeof document === 'string' ? parse(document) : document;
}
