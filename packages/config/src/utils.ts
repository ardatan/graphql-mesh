import { parse } from 'graphql';
import { MeshHandlerLibrary, KeyValueCache, YamlConfig, MergerFn, ImportFn, MeshPubSub } from '@graphql-mesh/types';
import { resolve } from 'path';
import { IResolvers, printSchemaWithDirectives } from '@graphql-tools/utils';
import { paramCase } from 'param-case';
import { loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { get, set, kebabCase } from 'lodash';
import { stringInterpolator } from '@graphql-mesh/utils';
import { mergeResolvers } from '@graphql-tools/merge';
import { PubSub, withFilter } from 'graphql-subscriptions';
import { EventEmitter } from 'events';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import StitchingMerger from '@graphql-mesh/merger-stitching';

export async function getPackage<T>(name: string, type: string, importFn: ImportFn): Promise<T> {
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
  if (name.includes('-')) {
    possibleNames.push(name);
  }
  const possibleModules = possibleNames.concat(resolve(process.cwd(), name));

  for (const moduleName of possibleModules) {
    try {
      const exported = await importFn(moduleName);

      return (exported.default || exported.parser || exported) as T;
    } catch (err) {
      if (
        !err.message.includes(`Cannot find module '${moduleName}'`) &&
        !err.message.includes(`Could not locate module`)
      ) {
        throw new Error(`Unable to load ${type} matching ${name}: ${err.message}`);
      }
    }
  }

  throw new Error(`Unable to find ${type} matching ${name}`);
}

export async function getHandler(name: keyof YamlConfig.Handler, importFn: ImportFn): Promise<MeshHandlerLibrary> {
  const handlerFn = await getPackage<MeshHandlerLibrary>(name.toString(), 'handler', importFn);

  return handlerFn;
}

export async function resolveAdditionalTypeDefs(baseDir: string, additionalTypeDefs: string) {
  if (additionalTypeDefs) {
    const sources = await loadTypedefs(additionalTypeDefs, {
      cwd: baseDir,
      loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
    });
    return sources.map(source => source.document || parse(source.rawSDL || printSchemaWithDirectives(source.schema)));
  }
  return undefined;
}

export async function resolveAdditionalResolvers(
  baseDir: string,
  additionalResolvers: (
    | string
    | YamlConfig.AdditionalStitchingResolverObject
    | YamlConfig.AdditionalSubscriptionObject
  )[],
  importFn: ImportFn,
  pubsub: MeshPubSub
): Promise<IResolvers> {
  const loadedResolvers = await Promise.all(
    (additionalResolvers || []).map(async additionalResolver => {
      if (typeof additionalResolver === 'string') {
        const filePath = additionalResolver;

        const exported = await importFn(resolve(baseDir, filePath));
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
        if ('pubsubTopic' in additionalResolver) {
          return {
            [additionalResolver.type]: {
              [additionalResolver.field]: {
                subscribe: withFilter(
                  (root, args, context, info) => {
                    const resolverData = { root, args, context, info };
                    const topic = stringInterpolator.parse(additionalResolver.pubsubTopic, resolverData);
                    return pubsub.asyncIterator(topic);
                  },
                  (root, args, context, info) => {
                    return additionalResolver.filterBy ? eval(additionalResolver.filterBy) : true;
                  }
                ),
                resolve: (payload: any) => {
                  if (additionalResolver.returnData) {
                    return get(payload, additionalResolver.returnData);
                  }
                  return payload;
                },
              },
            },
          };
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
      }
    })
  );

  return mergeResolvers(loadedResolvers);
}

export async function resolveCache(
  cacheConfig: YamlConfig.Config['cache'],
  importFn: ImportFn
): Promise<KeyValueCache | undefined> {
  if (cacheConfig) {
    const cacheName = Object.keys(cacheConfig)[0];
    const config = cacheConfig[cacheName];

    const moduleName = kebabCase(cacheName.toString());
    const pkg = await getPackage<any>(moduleName, 'cache', importFn);
    const Cache = pkg.default || pkg;

    return new Cache(config);
  }
  const InMemoryLRUCache = await import('@graphql-mesh/cache-inmemory-lru').then(m => m.default);
  const cache = new InMemoryLRUCache();
  return cache;
}

export async function resolvePubSub(
  pubsubYamlConfig: YamlConfig.Config['pubsub'],
  importFn: ImportFn
): Promise<MeshPubSub> {
  if (pubsubYamlConfig) {
    let pubsubName: string;
    let pubsubConfig: any;
    if (typeof pubsubYamlConfig === 'string') {
      pubsubName = pubsubYamlConfig;
    } else {
      pubsubName = pubsubYamlConfig.name;
      pubsubConfig = pubsubYamlConfig.config;
    }

    const moduleName = kebabCase(pubsubName.toString());
    const pkg = await getPackage<any>(moduleName, 'pubsub', importFn);
    const PubSub = pkg.default || pkg;

    return new PubSub(pubsubConfig);
  } else {
    const eventEmitter = new EventEmitter({ captureRejections: true });
    eventEmitter.setMaxListeners(Infinity);
    const pubsub = new PubSub({ eventEmitter }) as MeshPubSub;

    return pubsub;
  }
}

export async function resolveMerger(mergerConfig: YamlConfig.Config['merger'], importFn: ImportFn): Promise<MergerFn> {
  if (mergerConfig) {
    const pkg = await getPackage<any>(mergerConfig, 'merger', importFn);
    return pkg.default || pkg;
  }
  return StitchingMerger;
}
