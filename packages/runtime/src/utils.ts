import { IResolvers } from 'graphql-tools-fork';
import { ResolvedTransform, GraphQLOperation } from './types';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLResolveInfo,
  DocumentNode,
  parse,
  GraphQLFieldResolver,
  GraphQLField,
  FieldNode,
  Kind,
  OperationDefinitionNode,
  OperationTypeNode,
  isObjectType,
  SelectionSetNode
} from 'graphql';
import {
  Hooks,
  MeshHandlerLibrary,
  KeyValueCache,
  YamlConfig
} from '@graphql-mesh/types';
import { resolve } from 'path';
import Maybe from 'graphql/tsutils/Maybe';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { buildResolveInfo } from 'graphql/execution/execute';

export async function applySchemaTransformations(
  name: string,
  schema: GraphQLSchema,
  transformations: ResolvedTransform[],
  cache: KeyValueCache,
  hooks: Hooks
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;

  for (const transformation of transformations) {
    resultSchema = await transformation.transformFn({
      apiName: name,
      schema: resultSchema,
      config: transformation.config,
      cache,
      hooks
    });
  }

  return resultSchema;
}

export async function applyOutputTransformations(
  schema: GraphQLSchema,
  transformations: ResolvedTransform[],
  cache: KeyValueCache,
  hooks: Hooks
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;

  for (const transformation of transformations) {
    resultSchema = await transformation.transformFn({
      schema: resultSchema,
      config: transformation.config,
      cache,
      hooks
    });
  }

  return resultSchema;
}

export async function getPackage<T>(name: string, type: string): Promise<T> {
  const possibleNames = [
    `@graphql-mesh/${name}`,
    `@graphql-mesh/${name}-${type}`,
    name,
    `${name}-${type}`,
    type
  ];
  const possibleModules = possibleNames.concat(resolve(process.cwd(), name));

  for (const moduleName of possibleModules) {
    try {
      const exported = await import(moduleName);

      return (exported.default || exported.parser || exported) as T;
    } catch (err) {
      if (err.message.indexOf(`Cannot find module '${moduleName}'`) === -1) {
        throw new Error(
          `Unable to load ${type} matching ${name}: ${err.message}`
        );
      }
    }
  }

  throw new Error(`Unable to find ${type} matching ${name}`);
}

export async function getHandler(name: string): Promise<MeshHandlerLibrary> {
  const handlerFn = await getPackage<MeshHandlerLibrary>(name, 'handler');

  return handlerFn;
}

export async function resolveAdditionalResolvers(
  baseDir: string,
  additionalResolvers: string[]
): Promise<IResolvers> {
  const loaded = await Promise.all(
    (additionalResolvers || []).map(async filePath => {
      const exported = require(resolve(baseDir, filePath));
      let resolvers = null;

      if (exported.default) {
        if (exported.default.resolvers) {
          resolvers = exported.default.resolvers;
        } else if (typeof exported.default === 'object') {
          resolvers = exported.default;
        }
      } else if (exported.resolvers) {
        resolvers = exported.resolvers;
      }

      if (!resolvers) {
        console.warn(`Unable to load resolvers from file: ${filePath}`);

        return {};
      }

      return resolvers;
    })
  );

  return loaded.reduce((prev, t) => {
    return {
      ...prev,
      ...t
    };
  }, {} as IResolvers);
}

function buildFieldNode(field: GraphQLField<any, any>): FieldNode {
  const hasSelectionSet = isObjectType(field.type);
  const subFieldNodes: FieldNode[] = [];
  const selectionSet: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: subFieldNodes,
  };
  const fieldNode: FieldNode = {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: field.name,
    },
    selectionSet: hasSelectionSet ? selectionSet : undefined,
  };

  if (hasSelectionSet) {
    const subFields = Object.values((field.type as GraphQLObjectType).getFields());
    for (const subField of subFields) {
      if (!isObjectType(subField)) {
        subFieldNodes.push({
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: subField.name,
          },
        })
      }
    } 
  }
  
  return fieldNode;
}

export async function extractSdkFromResolvers(
  schema: GraphQLSchema,
  hooks: Hooks,
  types: Maybe<GraphQLObjectType>[],
  contextBuilder?: (initialContextValue: any) => Promise<any>,
) {
  const sdk: Record<string, Function> = {};

  await Promise.all(
    types.map(async type => {
      if (type) {
        const fields = type.getFields();

        await Promise.all(
          Object.entries(fields).map(async ([fieldName, field]) => {
            const resolveFn = field.resolve;

            let fn: GraphQLFieldResolver<any, any> = resolveFn
              ? async (args: any, context: any, info: GraphQLResolveInfo) => {

                const fieldNode = buildFieldNode(field);
                const fieldNodes = [fieldNode];

                const operation: OperationDefinitionNode = {
                  kind: Kind.OPERATION_DEFINITION,
                  name: {
                    kind: Kind.NAME,
                    value: `${type.name}_${fieldName}`,
                  },
                  operation: type.name.toLowerCase() as OperationTypeNode,
                  selectionSet: {
                    kind: Kind.SELECTION_SET,
                    selections: fieldNodes,
                  }
                };

                info = info && buildResolveInfo({
                  schema,
                  fragments: {},
                  rootValue: null,
                  contextValue: context,
                  operation,
                  variableValues: args,
                  get fieldResolver() {
                    return fn; // Get new one if replaced
                  },
                  errors: [],
                },
                  field,
                  fieldNodes,
                  type,
                  {
                    prev: undefined,
                    key: field.name,
                  },
                );

                return resolveFn(null, args, context.__isMeshContext ? context : {
                  ...contextBuilder && await contextBuilder(context),
                  ...context,
                }, info)
              }
              : () => null;

            hooks.emit('buildSdkFn', {
              schema,
              typeName: type.name,
              fieldName: fieldName,
              originalResolveFn: resolveFn,
              replaceFn: newFn => {
                if (newFn) {
                  fn = newFn;
                }
              }
            });

            sdk[fieldName] = fn;
          })
        );
      }
    })
  );

  return sdk;
}

export function ensureDocumentNode(document: GraphQLOperation): DocumentNode {
  return typeof document === 'string' ? parse(document) : document;
}

export async function resolveCache(
  cacheConfig?: YamlConfig.Config['cache']
): Promise<KeyValueCache> {
  if (!cacheConfig) {
    return new InMemoryLRUCache();
  }

  const [moduleName, exportName] = cacheConfig.name.split('#');
  const pkg = await getPackage<any>(moduleName, 'cache');
  const Cache = exportName ? pkg[exportName] : pkg;

  return new Cache(cacheConfig.config);
}
