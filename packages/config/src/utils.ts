import { parse } from 'graphql';
import {
  MeshHandlerLibrary,
  KeyValueCache,
  YamlConfig,
  MergerFn,
  ImportFn,
  MeshPubSub,
  Logger,
} from '@graphql-mesh/types';
import { resolve } from 'path';
import { IResolvers, printSchemaWithDirectives } from '@graphql-tools/utils';
import { paramCase } from 'param-case';
import { loadDocuments, loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import _ from 'lodash';
import { loadFromModuleExportExpression, stringInterpolator } from '@graphql-mesh/utils';
import { mergeResolvers } from '@graphql-tools/merge';
import { PubSub, withFilter } from 'graphql-subscriptions';
import { EventEmitter } from 'events';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { MeshStore } from '@graphql-mesh/store';
import { DefaultLogger } from '@graphql-mesh/runtime';

export async function getPackage<T>(name: string, type: string, importFn: ImportFn, cwd: string): Promise<T> {
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
  const possibleModules = possibleNames.concat(resolve(cwd, name));

  for (const moduleName of possibleModules) {
    try {
      const exported = await importFn(moduleName);

      return (exported.default || exported.parser || exported) as T;
    } catch (err) {
      if (
        !err.message.includes(`Cannot find module '${moduleName}'`) &&
        !err.message.includes(`Cannot find package '${moduleName}'`) &&
        !err.message.includes(`Could not locate module`)
      ) {
        throw new Error(`Unable to load ${type} matching ${name}: ${err.message}`);
      }
    }
  }

  throw new Error(`Unable to find ${type} matching ${name}`);
}

export async function getHandler(
  name: keyof YamlConfig.Handler,
  importFn: ImportFn,
  cwd: string
): Promise<MeshHandlerLibrary> {
  const handlerFn = await getPackage<MeshHandlerLibrary>(name.toString(), 'handler', importFn, cwd);

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
    | YamlConfig.AdditionalStitchingBatchResolverObject
  )[],
  importFn: ImportFn,
  pubsub: MeshPubSub
): Promise<IResolvers> {
  const loadedResolvers = await Promise.all(
    (additionalResolvers || []).map(async additionalResolver => {
      if (typeof additionalResolver === 'string') {
        const filePath = additionalResolver;

        const exported = await loadFromModuleExportExpression<any>(additionalResolver, {
          cwd: baseDir,
          importFn,
        });

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
            [additionalResolver.targetTypeName]: {
              [additionalResolver.targetFieldName]: {
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
                    return _.get(payload, additionalResolver.returnData);
                  }
                  return payload;
                },
              },
            },
          };
        } else if ('key' in additionalResolver) {
          return {
            [additionalResolver.targetTypeName]: {
              [additionalResolver.targetFieldName]: {
                selectionSet: additionalResolver.requiredSelectionSet,
                resolve: async (root: any, args: any, context: any, info: any) => {
                  const resolverData = { root, args, context, info };
                  const targetArgsFromKeys: any = {};
                  for (const argPath in additionalResolver.argsFromKeys) {
                    _.set(
                      targetArgsFromKeys,
                      argPath,
                      stringInterpolator.parse(additionalResolver.argsFromKeys[argPath], resolverData)
                    );
                  }
                  const key = stringInterpolator.parse(additionalResolver.key, resolverData);
                  return context[additionalResolver.sourceName][additionalResolver.sourceTypeName][
                    additionalResolver.sourceFieldName
                  ]({
                    root,
                    context,
                    info,
                    argsFromKeys: targetArgsFromKeys,
                    key,
                  });
                },
              },
            },
          };
        } else {
          return {
            [additionalResolver.targetTypeName]: {
              [additionalResolver.targetFieldName]: {
                selectionSet: additionalResolver.requiredSelectionSet,
                resolve: async (root: any, args: any, context: any, info: any) => {
                  const resolverData = { root, args, context, info };
                  const targetArgs: any = {};
                  for (const argPath in additionalResolver.sourceArgs) {
                    _.set(
                      targetArgs,
                      argPath,
                      stringInterpolator.parse(additionalResolver.sourceArgs[argPath], resolverData)
                    );
                  }
                  const result = await context[additionalResolver.sourceName][additionalResolver.sourceTypeName][
                    additionalResolver.sourceFieldName
                  ]({
                    root,
                    args: targetArgs,
                    context,
                    info,
                    selectionSet: additionalResolver.sourceSelectionSet,
                  });
                  return additionalResolver.returnData ? _.get(result, additionalResolver.returnData) : result;
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
  cacheConfig: YamlConfig.Config['cache'] = { inmemoryLru: {} },
  importFn: ImportFn,
  store: MeshStore,
  cwd: string
): Promise<KeyValueCache | undefined> {
  const cacheName = Object.keys(cacheConfig)[0];
  const config = cacheConfig[cacheName];

  const moduleName = _.kebabCase(cacheName.toString());
  const pkg = await getPackage<any>(moduleName, 'cache', importFn, cwd);
  const Cache = pkg.default || pkg;

  return new Cache({
    ...config,
    store,
  });
}

export async function resolvePubSub(
  pubsubYamlConfig: YamlConfig.Config['pubsub'],
  importFn: ImportFn,
  cwd: string
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

    const moduleName = _.kebabCase(pubsubName.toString());
    const pkg = await getPackage<any>(moduleName, 'pubsub', importFn, cwd);
    const PubSub = pkg.default || pkg;

    return new PubSub(pubsubConfig);
  } else {
    const eventEmitter = new EventEmitter({ captureRejections: true });
    eventEmitter.setMaxListeners(Infinity);
    const pubsub = new PubSub({ eventEmitter }) as MeshPubSub;

    return pubsub;
  }
}

export async function resolveMerger(
  mergerConfig: YamlConfig.Config['merger'] = 'stitching',
  importFn: ImportFn,
  cwd: string
): Promise<MergerFn> {
  const pkg = await getPackage<any>(mergerConfig, 'merger', importFn, cwd);
  return pkg.default || pkg;
}

export async function resolveDocuments(documentsConfig: YamlConfig.Config['documents'], cwd: string) {
  if (!documentsConfig) {
    return [];
  }
  return loadDocuments(documentsConfig, {
    loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
    skipGraphQLImport: true,
    cwd,
  });
}

export async function resolveLogger(
  loggerConfig: YamlConfig.Config['logger'],
  importFn: ImportFn,
  cwd: string
): Promise<Logger> {
  if (typeof loggerConfig === 'string') {
    const moduleName = _.kebabCase(loggerConfig.toString());
    const pkg = await getPackage<any>(moduleName, 'logger', importFn, cwd);
    return pkg.default || pkg;
  }
  return new DefaultLogger('Mesh');
}
