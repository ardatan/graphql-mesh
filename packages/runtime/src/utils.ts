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
  SelectionSetNode,
  print,
  isScalarType,
  isUnionType
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
import { buildOperation } from './generate-operation-for-field';

export async function applySchemaTransformations(
  name: string,
  schema: GraphQLSchema,
  transformations: ResolvedTransform[],
  cache: KeyValueCache,
  hooks: Hooks
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;

  for (const transformation of transformations) {
    const transformedSchema = await transformation.transformFn({
      apiName: name,
      schema: resultSchema,
      config: transformation.config,
      cache,
      hooks
    });

    if (transformedSchema) {
      resultSchema = transformedSchema;
    }
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
    const transformedSchema = await transformation.transformFn({
      schema: resultSchema,
      config: transformation.config,
      cache,
      hooks
    });

    if (transformedSchema) {
      resultSchema = transformedSchema;
    }
  }

  return resultSchema;
}

export async function getPackage<T>(name: string, type: string): Promise<T> {
  const possibleNames = [
    `@graphql-mesh/${name}`,
    `@graphql-mesh/${name}-${type}`,
    `@graphql-mesh/${type}-${name}`,
    name,
    `${name}-${type}`,
    `${type}-${name}`,
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
      const exported = await import(resolve(baseDir, filePath));
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

            let fn: (...args: any[]) => any = resolveFn
              ? (args: any, context: any, info: GraphQLResolveInfo) => resolveFn(null, args, context, info)
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

            sdk[fieldName] = async (args: any, context: any, info: GraphQLResolveInfo) => {
              if (!info) {
                const operation = buildOperation({
                  schema,
                  kind: 'query',
                  field: fieldName,
                  depthLimit: 2,
                  argNames: Object.keys(args),
                });

                info = buildResolveInfo({
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
                  operation.selectionSet.selections.filter(s => s.kind === Kind.FIELD) as FieldNode[],
                  type,
                  {
                    prev: undefined,
                    key: field.name,
                  },
                );
              }

              if (!(context?.__isMeshContext)) {
                context = {
                  ...contextBuilder && await contextBuilder(context),
                  ...context,
                };
              }

              return fn(args, context, info)
            };
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
