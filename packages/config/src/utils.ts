import { GraphQLResolveInfo, Kind, parse, SelectionSetNode } from 'graphql';
import { KeyValueCache, YamlConfig, ImportFn, MeshPubSub, Logger } from '@graphql-mesh/types';
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

type ResolvedPackage<T> = {
  moduleName: string;
  resolved: T;
};

export async function getPackage<T>(
  name: string,
  type: string,
  importFn: ImportFn,
  cwd: string
): Promise<ResolvedPackage<T>> {
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
      const resolved = exported.default || (exported as T);
      return {
        moduleName,
        resolved,
      };
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
                  if (additionalResolver.result) {
                    return _.get(payload, additionalResolver.result);
                  }
                  return payload;
                },
              },
            },
          };
        } else if ('keysArg' in additionalResolver) {
          return {
            [additionalResolver.targetTypeName]: {
              [additionalResolver.targetFieldName]: {
                selectionSet: additionalResolver.requiredSelectionSet || `{ ${additionalResolver.keyField} }`,
                resolve: async (root: any, args: any, context: any, info: any) => {
                  const resolverData = { root, args, context, info };
                  const targetArgs: any = {};
                  for (const argPath in additionalResolver.additionalArgs || {}) {
                    _.set(
                      targetArgs,
                      argPath,
                      stringInterpolator.parse(additionalResolver.additionalArgs[argPath], resolverData)
                    );
                  }
                  return context[additionalResolver.sourceName][additionalResolver.sourceTypeName][
                    additionalResolver.sourceFieldName
                  ]({
                    root,
                    context,
                    info,
                    argsFromKeys: (keys: string[]) => ({
                      [additionalResolver.keysArg]: keys,
                      ...targetArgs,
                    }),
                    key: _.get(root, additionalResolver.keyField),
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
                resolve: async (root: any, args: any, context: any, info: GraphQLResolveInfo) => {
                  const resolverData = { root, args, context, info };
                  const targetArgs: any = {};
                  for (const argPath in additionalResolver.sourceArgs) {
                    _.set(
                      targetArgs,
                      argPath,
                      stringInterpolator.parse(additionalResolver.sourceArgs[argPath].toString(), resolverData)
                    );
                  }
                  const options: any = {
                    root,
                    args: targetArgs,
                    context,
                    info,
                  };
                  if (additionalResolver.sourceSelectionSet) {
                    options.selectionSet = () => parse(additionalResolver.sourceSelectionSet);
                    // If result path provided without a selectionSet
                  } else if (additionalResolver.result) {
                    const resultPathReversed = _.toPath(additionalResolver.result);
                    options.selectionSet = (subtree: SelectionSetNode) => {
                      let finalSelectionSet = subtree;
                      let isLastResult = true;
                      for (const pathElem of resultPathReversed) {
                        if (Number.isNaN(parseInt(pathElem))) {
                          if (isLastResult && additionalResolver.resultType) {
                            finalSelectionSet = {
                              kind: Kind.SELECTION_SET,
                              selections: [
                                {
                                  kind: Kind.INLINE_FRAGMENT,
                                  typeCondition: {
                                    kind: Kind.NAMED_TYPE,
                                    name: {
                                      kind: Kind.NAME,
                                      value: additionalResolver.resultType,
                                    },
                                  },
                                  selectionSet: finalSelectionSet,
                                },
                              ],
                            };
                          }
                          finalSelectionSet = {
                            kind: Kind.SELECTION_SET,
                            selections: [
                              {
                                // we create a wrapping AST Field
                                kind: Kind.FIELD,
                                name: {
                                  kind: Kind.NAME,
                                  value: pathElem,
                                },
                                // Inside the field selection
                                selectionSet: finalSelectionSet,
                              },
                            ],
                          };
                          isLastResult = false;
                        }
                      }
                      return finalSelectionSet;
                    };
                  }
                  const result = await context[additionalResolver.sourceName][additionalResolver.sourceTypeName][
                    additionalResolver.sourceFieldName
                  ](options);
                  return additionalResolver.result ? _.get(result, additionalResolver.result) : result;
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
  rootStore: MeshStore,
  cwd: string
): Promise<{
  cache: KeyValueCache;
  importCode: string;
  code: string;
}> {
  const cacheName = Object.keys(cacheConfig)[0].toString();
  const config = cacheConfig[cacheName];

  const { moduleName, resolved: Cache } = await getPackage<any>(cacheName, 'cache', importFn, cwd);

  const cache = new Cache({
    ...config,
    store: rootStore.child('cache'),
  });

  const code = `const cache = new MeshCache({
      ...(${JSON.stringify(config, null, 2)}),
      store: rootStore.child('cache'),
    } as any)`;
  const importCode = `import MeshCache from '${moduleName}';`;

  return {
    cache,
    importCode,
    code,
  };
}

export async function resolvePubSub(
  pubsubYamlConfig: YamlConfig.Config['pubsub'],
  importFn: ImportFn,
  cwd: string
): Promise<{
  importCode: string;
  code: string;
  pubsub: MeshPubSub;
}> {
  if (pubsubYamlConfig) {
    let pubsubName: string;
    let pubsubConfig: any;
    if (typeof pubsubYamlConfig === 'string') {
      pubsubName = pubsubYamlConfig;
    } else {
      pubsubName = pubsubYamlConfig.name;
      pubsubConfig = pubsubYamlConfig.config;
    }

    const { moduleName, resolved: PubSub } = await getPackage<any>(pubsubName, 'pubsub', importFn, cwd);

    const pubsub = new PubSub(pubsubConfig);

    const importCode = `import PubSub from '${moduleName}'`;
    const code = `const pubsub = new PubSub(${JSON.stringify(pubsubConfig, null, 2)});`;

    return {
      importCode,
      code,
      pubsub,
    };
  } else {
    const eventEmitter = new EventEmitter({ captureRejections: true });
    eventEmitter.setMaxListeners(Infinity);
    const pubsub = new PubSub({ eventEmitter }) as MeshPubSub;

    const importCode = `import { PubSub } from 'graphql-subscriptions';
import { EventEmitter } from 'events';`;
    const code = `const eventEmitter = new EventEmitter({ captureRejections: true });
eventEmitter.setMaxListeners(Infinity);
const pubsub = new PubSub({ eventEmitter });`;

    return {
      importCode,
      code,
      pubsub,
    };
  }
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
): Promise<{
  importCode: string;
  code: string;
  logger: Logger;
}> {
  if (typeof loggerConfig === 'string') {
    const { moduleName, resolved: logger } = await getPackage<Logger>(loggerConfig, 'logger', importFn, cwd);
    return {
      logger,
      importCode: `import logger from '${moduleName}';`,
      code: '',
    };
  }
  const logger = new DefaultLogger('Mesh');
  return {
    logger,
    importCode: `import { DefaultLogger } from '@graphql-mesh/runtime';`,
    code: `const logger = new DefaultLogger('Mesh');`,
  };
}
