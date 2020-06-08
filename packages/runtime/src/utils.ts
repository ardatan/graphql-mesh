import { GraphQLOperation } from './types';
import { DocumentNode, parse } from 'graphql';
import { MeshHandlerLibrary, KeyValueCache, YamlConfig, MergerFn } from '@graphql-mesh/types';
import { resolve } from 'path';
import { IResolvers, printSchemaWithDirectives } from '@graphql-tools/utils';
import { paramCase } from 'param-case';
import { loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { get, set, kebabCase } from 'lodash';
import { stringInterpolator } from '@graphql-mesh/utils';
import { mergeResolvers } from '@graphql-tools/merge';

export async function getPackage<T>(name: string, type: string): Promise<T> {
  const casedName = paramCase(name);
  const casedType = paramCase(type);
  const possibleNames = [
    `@graphql-mesh/${casedName}`,
    `@graphql-mesh/${casedName}-${casedType}`,
    `@graphql-mesh/${casedType}-${casedName}`,
    casedName,
    `${casedName}-${casedType}`,
    `${casedType}-${casedName}`,
    casedType,
  ];
  const possibleModules = possibleNames.concat(resolve(process.cwd(), name));

  for (const moduleName of possibleModules) {
    try {
      const exported = await import(moduleName);

      return (exported.default || exported.parser || exported) as T;
    } catch (err) {
      if (err.message.indexOf(`Cannot find module '${moduleName}'`) === -1) {
        throw new Error(`Unable to load ${type} matching ${name}: ${err.message}`);
      }
    }
  }

  throw new Error(`Unable to find ${type} matching ${name}`);
}

export async function getHandler(name: string): Promise<MeshHandlerLibrary> {
  const handlerFn = await getPackage<MeshHandlerLibrary>(name, 'handler');

  return handlerFn;
}

export async function resolveAdditionalTypeDefs(baseDir: string, additionalTypeDefs: string) {
  if (additionalTypeDefs) {
    const sources = await loadTypedefs(additionalTypeDefs, {
      cwd: baseDir,
      loaders: [new GraphQLFileLoader()],
    });
    return sources.map(source => source.document || parse(source.rawSDL || printSchemaWithDirectives(source.schema)));
  }
  return undefined;
}

export async function resolveAdditionalResolvers(
  baseDir: string,
  additionalResolvers: (string | YamlConfig.AdditionalResolverObject)[]
): Promise<IResolvers> {
  const loadedResolvers = await Promise.all(
    (additionalResolvers || []).map(async additionalResolver => {
      if (typeof additionalResolver === 'string') {
        const filePath = additionalResolver;

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
      } else {
        return {
          [additionalResolver.type]: {
            [additionalResolver.field]: {
              selectionSet: additionalResolver.requiredSelectionSet,
              resolve: async (root: any, args: any, context: any, info: any) => {
                const resolverData = { root, args, context, info };
                const methodArgs: any = {};
                for (const argPath in additionalResolver.args) {
                  set(methodArgs, argPath, stringInterpolator.parse(additionalResolver.args[argPath], resolverData));
                }
                const result = await context[additionalResolver.targetSource].api[additionalResolver.targetMethod](
                  methodArgs,
                  {
                    selectedFields: additionalResolver.resultSelectedFields,
                    selectionSet: additionalResolver.resultSelectionSet,
                    depth: additionalResolver.resultDepth,
                  }
                );
                return additionalResolver.returnData ? get(result, additionalResolver.returnData) : result;
              },
            },
          },
        };
      }
    })
  );

  return mergeResolvers(loadedResolvers);
}

export function ensureDocumentNode(document: GraphQLOperation): DocumentNode {
  return typeof document === 'string' ? parse(document) : document;
}

export async function resolveCache(cacheConfig?: YamlConfig.Config['cache']): Promise<KeyValueCache> {
  const cacheName = Object.keys(cacheConfig)[0];
  const config = cacheConfig[cacheName];

  const moduleName = kebabCase(cacheName);
  const pkg = await getPackage<any>(moduleName, 'cache');
  const Cache = pkg.default || pkg;

  return new Cache(config);
}

export async function resolveMerger(mergerConfig?: YamlConfig.Config['merger']): Promise<MergerFn> {
  const pkg = await getPackage<any>(mergerConfig || 'stitching', 'merger');
  return pkg.default || pkg;
}
