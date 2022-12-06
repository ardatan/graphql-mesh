import { path as pathModule, process } from '@graphql-mesh/cross-helpers';
import type { GetMeshOptions, MeshResolvedSource } from '@graphql-mesh/runtime';
import {
  ImportFn,
  MeshHandlerLibrary,
  MeshMergerLibrary,
  MeshPluginFactory,
  MeshTransformLibrary,
  YamlConfig,
} from '@graphql-mesh/types';
import { Source } from '@graphql-tools/utils';
import { concatAST, DocumentNode, parse, print, visit } from 'graphql';
import {
  getPackage,
  resolveAdditionalTypeDefs,
  resolveCache,
  resolvePubSub,
  resolveDocuments,
  resolveLogger,
  resolveCustomFetch,
} from './utils.js';
import { FsStoreStorageAdapter, MeshStore, InMemoryStoreStorageAdapter } from '@graphql-mesh/store';
import { pascalCase } from 'pascal-case';
import { camelCase } from 'camel-case';
import { defaultImportFn, parseWithCache, resolveAdditionalResolvers } from '@graphql-mesh/utils';
import { useMaskedErrors } from '@envelop/core';
import { getAdditionalResolversFromTypeDefs } from './getAdditionalResolversFromTypeDefs.js';

const ENVELOP_CORE_PLUGINS_MAP = {
  maskedErrors: {
    moduleName: '@envelop/core',
    importName: 'useMaskedErrors',
    pluginFactory: useMaskedErrors,
  },
};

export type ConfigProcessOptions = {
  dir?: string;
  importFn?: ImportFn;
  store?: MeshStore;
  ignoreAdditionalResolvers?: boolean;
  configName?: string;
  artifactsDir?: string;
  additionalPackagePrefixes?: string[];
  generateCode?: boolean;
  initialLoggerPrefix?: string;
  throwOnInvalidConfig?: boolean;
};

export type ProcessedConfig = GetMeshOptions & {
  config: YamlConfig.Config;
  documents: Source[];
  store: MeshStore;
  importCodes: Set<string>;
  codes: Set<string>;
};

function getDefaultMeshStore(dir: string, importFn: ImportFn, artifactsDir: string) {
  const isProd = process.env.NODE_ENV?.toLowerCase() === 'production';
  const storeStorageAdapter = isProd
    ? new FsStoreStorageAdapter({
        cwd: dir,
        importFn,
        fileType: 'ts',
      })
    : new InMemoryStoreStorageAdapter();
  return new MeshStore(pathModule.resolve(dir, artifactsDir), storeStorageAdapter, {
    /**
     * TODO:
     * `mesh start` => { readonly: true, validate: false }
     * `mesh dev` => { readonly: false, validate: true } => validation error should show a prompt for confirmation
     * `mesh validate` => { readonly: true, validate: true } => should fetch from remote and try to update
     * readonly
     */
    readonly: isProd,
    validate: false,
  });
}

export async function processConfig(
  config: YamlConfig.Config,
  options?: ConfigProcessOptions
): Promise<ProcessedConfig> {
  if (config.skipSSLValidation) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const importCodes = new Set([
    `import type { GetMeshOptions } from '@graphql-mesh/runtime';`,
    `import type { YamlConfig } from '@graphql-mesh/types';`,
  ]);
  const codes = new Set([
    `export const rawServeConfig: YamlConfig.Config['serve'] = ${JSON.stringify(config.serve)} as any`,
    `export async function getMeshOptions(): Promise<GetMeshOptions> {`,
  ]);

  const {
    dir,
    importFn = defaultImportFn,
    store: providedStore,
    artifactsDir,
    additionalPackagePrefixes = [],
  } = options || {};

  if (config.require) {
    await Promise.all(config.require.map(mod => importFn(mod)));
    for (const mod of config.require) {
      importCodes.add(`import '${mod}';`);
    }
  }

  const rootStore = providedStore || getDefaultMeshStore(dir, importFn, artifactsDir || '.mesh');

  const {
    pubsub,
    importCode: pubsubImportCode,
    code: pubsubCode,
  } = await resolvePubSub(config.pubsub, importFn, dir, additionalPackagePrefixes);
  importCodes.add(pubsubImportCode);
  codes.add(pubsubCode);

  const sourcesStore = rootStore.child('sources');
  codes.add(`const sourcesStore = rootStore.child('sources');`);

  const {
    logger,
    importCode: loggerImportCode,
    code: loggerCode,
  } = await resolveLogger(config.logger, importFn, dir, additionalPackagePrefixes, options?.initialLoggerPrefix);
  importCodes.add(loggerImportCode);
  codes.add(loggerCode);

  const {
    cache,
    importCode: cacheImportCode,
    code: cacheCode,
  } = await resolveCache(config.cache, importFn, rootStore, dir, pubsub, logger, additionalPackagePrefixes);
  importCodes.add(cacheImportCode);
  codes.add(cacheCode);

  const {
    fetchFn,
    importCode: fetchFnImportCode,
    code: fetchFnCode,
  } = await resolveCustomFetch({
    fetchConfig: config.customFetch,
    cache,
    importFn,
    cwd: dir,
    additionalPackagePrefixes,
  });

  importCodes.add(fetchFnImportCode);
  codes.add(fetchFnCode);

  importCodes.add(`import { MeshResolvedSource } from '@graphql-mesh/runtime';`);
  codes.add(`const sources: MeshResolvedSource[] = [];`);
  importCodes.add(`import { MeshTransform, MeshPlugin } from '@graphql-mesh/types';`);
  codes.add(`const transforms: MeshTransform[] = [];`);
  codes.add(`const additionalEnvelopPlugins: MeshPlugin<any>[] = [];`);

  const [sources, transforms, additionalEnvelopPlugins, additionalTypeDefs, additionalResolvers, documents] =
    await Promise.all([
      Promise.all(
        config.sources.map<Promise<MeshResolvedSource>>(async (source, sourceIndex) => {
          const handlerName = Object.keys(source.handler)[0].toString();
          const handlerConfig = source.handler[handlerName];
          const handlerVariableName = camelCase(`${source.name}_Handler`);
          const transformsVariableName = camelCase(`${source.name}_Transforms`);
          codes.add(`const ${transformsVariableName} = [];`);
          const [handler, transforms] = await Promise.all([
            await getPackage<MeshHandlerLibrary>({
              name: handlerName,
              type: 'handler',
              importFn,
              cwd: dir,
              additionalPrefixes: additionalPackagePrefixes,
            }).then(({ resolved: HandlerCtor, moduleName }) => {
              if (options.generateCode) {
                const handlerImportName = pascalCase(handlerName + '_Handler');
                importCodes.add(`import ${handlerImportName} from ${JSON.stringify(moduleName)}`);
                codes.add(`const ${handlerVariableName} = new ${handlerImportName}({
              name: ${JSON.stringify(source.name)},
              config: ${JSON.stringify(handlerConfig)},
              baseDir,
              cache,
              pubsub,
              store: sourcesStore.child(${JSON.stringify(source.name)}),
              logger: logger.child(${JSON.stringify(source.name)}),
              importFn,
            });`);
              }
              return new HandlerCtor({
                name: source.name,
                config: handlerConfig,
                baseDir: dir,
                cache,
                pubsub,
                store: sourcesStore.child(source.name),
                logger: logger.child(source.name),
                importFn,
              });
            }),
            Promise.all(
              (source.transforms || []).map(async (t, transformIndex) => {
                const transformName = Object.keys(t)[0].toString();
                const transformConfig = t[transformName];
                const { resolved: TransformCtor, moduleName } = await getPackage<MeshTransformLibrary>({
                  name: transformName,
                  type: 'transform',
                  importFn,
                  cwd: dir,
                  additionalPrefixes: additionalPackagePrefixes,
                });

                if (options.generateCode) {
                  const transformImportName = pascalCase(transformName + '_Transform');
                  importCodes.add(`import ${transformImportName} from ${JSON.stringify(moduleName)};`);
                  codes.add(`${transformsVariableName}[${transformIndex}] = new ${transformImportName}({
                  apiName: ${JSON.stringify(source.name)},
                  config: ${JSON.stringify(transformConfig)},
                  baseDir,
                  cache,
                  pubsub,
                  importFn,
                  logger,
                });`);
                }

                return new TransformCtor({
                  apiName: source.name,
                  config: transformConfig,
                  baseDir: dir,
                  cache,
                  pubsub,
                  importFn,
                  logger,
                });
              })
            ),
          ]);

          if (options.generateCode) {
            codes.add(`sources[${sourceIndex}] = {
          name: '${source.name}',
          handler: ${handlerVariableName},
          transforms: ${transformsVariableName}
        }`);
          }

          return {
            name: source.name,
            handler,
            transforms,
          };
        })
      ),
      Promise.all(
        config.transforms?.map(async (t, transformIndex) => {
          const transformName = Object.keys(t)[0].toString();
          const transformConfig = t[transformName];
          const { resolved: TransformLibrary, moduleName } = await getPackage<MeshTransformLibrary>({
            name: transformName,
            type: 'transform',
            importFn,
            cwd: dir,
            additionalPrefixes: additionalPackagePrefixes,
          });

          if (options.generateCode) {
            const transformImportName = pascalCase(transformName + '_Transform');
            importCodes.add(`import ${transformImportName} from ${JSON.stringify(moduleName)};`);

            codes.add(`transforms[${transformIndex}] = new (${transformImportName} as any)({
            apiName: '',
            config: ${JSON.stringify(transformConfig)},
            baseDir,
            cache,
            pubsub,
            importFn,
            logger,
          })`);
          }
          return new TransformLibrary({
            apiName: '',
            config: transformConfig,
            baseDir: dir,
            cache,
            pubsub,
            importFn,
            logger,
          });
        }) || []
      ),
      Promise.all(
        config.plugins?.map(async (p, pluginIndex) => {
          const pluginName = Object.keys(p)[0].toString();
          const pluginConfig: any = p[pluginName];
          if (ENVELOP_CORE_PLUGINS_MAP[pluginName] != null) {
            const { importName, moduleName, pluginFactory } = ENVELOP_CORE_PLUGINS_MAP[pluginName];
            if (options.generateCode) {
              importCodes.add(`import { ${importName} } from ${JSON.stringify(moduleName)};`);
              codes.add(
                `additionalEnvelopPlugins[${pluginIndex}] = await ${importName}(${JSON.stringify(
                  pluginConfig,
                  null,
                  2
                )});`
              );
            }
            return pluginFactory(pluginConfig);
          }
          const { resolved: possiblePluginFactory, moduleName } = await getPackage<any>({
            name: pluginName,
            type: 'plugin',
            importFn,
            cwd: dir,
            additionalPrefixes: [...additionalPackagePrefixes, '@envelop/', '@graphql-yoga/plugin-'],
          });
          let pluginFactory: MeshPluginFactory<YamlConfig.Plugin[keyof YamlConfig.Plugin]>;
          if (typeof possiblePluginFactory === 'function') {
            pluginFactory = possiblePluginFactory;
            if (options.generateCode) {
              const importName = pascalCase('use_' + pluginName);
              importCodes.add(`import ${importName} from ${JSON.stringify(moduleName)};`);
              codes.add(`additionalEnvelopPlugins[${pluginIndex}] = await ${importName}({
          ...(${JSON.stringify(pluginConfig, null, 2)}),
          logger: logger.child(${JSON.stringify(pluginName)}),
          cache,
          pubsub,
          baseDir,
          importFn,
        })`);
            }
          } else {
            Object.keys(possiblePluginFactory).forEach(importName => {
              if (importName.toString().startsWith('use') && typeof possiblePluginFactory[importName] === 'function') {
                pluginFactory = possiblePluginFactory[importName];
                importName = importName.toString();
                if (options.generateCode) {
                  importCodes.add(`import { ${importName} } from ${JSON.stringify(moduleName)};`);
                  codes.add(
                    `additionalEnvelopPlugins[${pluginIndex}] = await ${importName}(${JSON.stringify(
                      pluginConfig,
                      null,
                      2
                    )});`
                  );
                }
              }
            });
          }
          return pluginFactory({
            ...pluginConfig,
            logger: logger.child(pluginName),
            cache,
            pubsub,
            baseDir: dir,
            importFn,
          });
        }) || []
      ),
      resolveAdditionalTypeDefs(dir, config.additionalTypeDefs).then(additionalTypeDefs => {
        if (options.generateCode) {
          codes.add(
            `const additionalTypeDefs = [${(additionalTypeDefs || []).map(
              parsedTypeDefs => `parse(${JSON.stringify(print(parsedTypeDefs))}),`
            )}] as any[];`
          );
          if (additionalTypeDefs?.length) {
            importCodes.add(`import { parse } from 'graphql';`);
          }
        }
        return additionalTypeDefs;
      }),
      options?.ignoreAdditionalResolvers
        ? []
        : resolveAdditionalResolvers(dir, config.additionalResolvers, importFn, pubsub),
      resolveDocuments(config.documents, dir),
    ]);

  if (options.generateCode) {
    if (config.additionalResolvers?.length) {
      codes.add(`const additionalResolvers = await Promise.all([
        ${config.additionalResolvers
          .map(additionalResolverDefinition => {
            if (typeof additionalResolverDefinition === 'string') {
              return `import(${JSON.stringify(
                pathModule.join('..', additionalResolverDefinition).split('\\').join('/')
              )})
            .then(m => m.resolvers || m.default || m)`;
            } else {
              importCodes.add(`import { resolveAdditionalResolversWithoutImport } from '@graphql-mesh/utils';`);
              return `resolveAdditionalResolversWithoutImport(
            ${JSON.stringify(additionalResolverDefinition, null, 2)}
          )`;
            }
          })
          .join(',\n')}
      ]);`);
    } else {
      codes.add(`const additionalResolvers = [] as any[]`);
    }
  }

  if (additionalTypeDefs?.length) {
    const additionalResolversConfigFromTypeDefs = getAdditionalResolversFromTypeDefs(additionalTypeDefs);
    if (additionalResolversConfigFromTypeDefs?.length) {
      const resolveToDirectiveDefinition = /* GraphQL */ `
        scalar ResolveToSourceArgs
        directive @resolveTo(
          requiredSelectionSet: String
          sourceName: String!
          sourceTypeName: String!
          sourceFieldName: String!
          sourceSelectionSet: String
          sourceArgs: ResolveToSourceArgs
          keyField: String
          keysArg: String
          pubsubTopic: String
          filterBy: String
          additionalArgs: ResolveToSourceArgs
          result: String
          resultType: String
        ) on FIELD_DEFINITION
      `;
      const resolvedAdditionalResolvers = await resolveAdditionalResolvers(
        dir,
        additionalResolversConfigFromTypeDefs,
        importFn,
        pubsub
      );
      additionalTypeDefs.unshift(parse(resolveToDirectiveDefinition));
      additionalResolvers.push(...resolvedAdditionalResolvers);
      if (options.generateCode && resolvedAdditionalResolvers.length) {
        importCodes.add(`import { resolveAdditionalResolvers } from '@graphql-mesh/utils';`);
        codes.add(`additionalTypeDefs.unshift(parse(/* GraphQL */\`${resolveToDirectiveDefinition}\`))`);
        codes.add(`const additionalResolversFromTypeDefs = await resolveAdditionalResolvers(
          baseDir,
          ${JSON.stringify(additionalResolversConfigFromTypeDefs)},
          importFn,
          pubsub
        );`);
        codes.add(`additionalResolvers.push(...additionalResolversFromTypeDefs)`);
      }
    }
  }

  let mergerName = config.merger;

  // Decide what is the default merger
  if (!mergerName) {
    if (config.sources.length > 1) {
      mergerName = 'stitching';
    } else {
      // eslint-disable-next-line no-labels
      resolversLoop: for (const resolversObj of additionalResolvers || []) {
        for (const typeName in resolversObj || {}) {
          const fieldResolvers = resolversObj[typeName];
          if (typeof fieldResolvers === 'object') {
            for (const fieldName in fieldResolvers) {
              const fieldResolveObj = fieldResolvers[fieldName];
              if (typeof fieldResolveObj === 'object') {
                // selectionSet needs stitching merger even if there is a single source
                if (fieldResolveObj.selectionSet != null) {
                  mergerName = 'stitching';
                  // eslint-disable-next-line no-labels
                  break resolversLoop;
                }
              }
            }
          }
        }
      }
      if (!mergerName) {
        mergerName = 'bare';
      }
    }
  }

  const { resolved: Merger, moduleName: mergerModuleName } = await getPackage<MeshMergerLibrary>({
    name: mergerName,
    type: 'merger',
    importFn,
    cwd: dir,
    additionalPrefixes: additionalPackagePrefixes,
  });

  if (options.generateCode) {
    const mergerImportName = pascalCase(`${mergerName}Merger`);
    importCodes.add(`import ${mergerImportName} from ${JSON.stringify(mergerModuleName)};`);
    codes.add(`const merger = new(${mergerImportName} as any)({
        cache,
        pubsub,
        logger: logger.child('${mergerName}Merger'),
        store: rootStore.child('${mergerName}Merger')
      })`);
  }

  const merger = new Merger({
    cache,
    pubsub,
    logger: logger.child(`${mergerName}Merger`),
    store: rootStore.child(`${mergerName}Merger`),
  });

  if (config.additionalEnvelopPlugins) {
    codes.add(
      `const importedAdditionalEnvelopPlugins = await import(${JSON.stringify(
        pathModule.join('..', config.additionalEnvelopPlugins).split('\\').join('/')
      )}).then(m => m.default || m);`
    );
    const importedAdditionalEnvelopPlugins = await importFn(
      pathModule.isAbsolute(config.additionalEnvelopPlugins)
        ? config.additionalEnvelopPlugins
        : pathModule.join(dir, config.additionalEnvelopPlugins)
    );
    if (typeof importedAdditionalEnvelopPlugins === 'function') {
      const factoryResult = await importedAdditionalEnvelopPlugins(config);
      if (Array.isArray(factoryResult)) {
        if (options.generateCode) {
          codes.add(`additionalEnvelopPlugins.push(...(await importedAdditionalEnvelopPlugins()));`);
        }
        additionalEnvelopPlugins.push(...factoryResult);
      } else {
        if (options.generateCode) {
          codes.add(`additionalEnvelopPlugins.push(await importedAdditionalEnvelopPlugins());`);
        }
        additionalEnvelopPlugins.push(factoryResult);
      }
    } else {
      if (Array.isArray(importedAdditionalEnvelopPlugins)) {
        if (options.generateCode) {
          codes.add(`additionalEnvelopPlugins.push(...importedAdditionalEnvelopPlugins)`);
        }
        additionalEnvelopPlugins.push(...importedAdditionalEnvelopPlugins);
      } else {
        if (options.generateCode) {
          codes.add(`additionalEnvelopPlugins.push(importedAdditionalEnvelopPlugins)`);
        }
        additionalEnvelopPlugins.push(importedAdditionalEnvelopPlugins);
      }
    }
  }

  if (options.generateCode) {
    const documentVariableNames: string[] = [];
    if (documents?.length) {
      importCodes.add(`import { printWithCache } from '@graphql-mesh/utils';`);
      const allDocumentNodes: DocumentNode = concatAST(
        documents.map(document => document.document || parseWithCache(document.rawSDL))
      );
      visit(allDocumentNodes, {
        OperationDefinition(node) {
          documentVariableNames.push(pascalCase(node.name.value + '_Document'));
        },
      });
    }

    codes.add(`
  return {
    sources,
    transforms,
    additionalTypeDefs,
    additionalResolvers,
    cache,
    pubsub,
    merger,
    logger,
    additionalEnvelopPlugins,
    get documents() {
      return [
      ${documentVariableNames
        .map(
          documentVarName => `{
        document: ${documentVarName},
        get rawSDL() {
          return printWithCache(${documentVarName});
        },
        location: '${documentVarName}.graphql'
      }`
        )
        .join(',')}
    ];
    },
    fetchFn,
  };
}`);
  }
  return {
    sources,
    transforms,
    additionalTypeDefs,
    additionalResolvers,
    cache,
    merger,
    pubsub,
    config,
    documents,
    logger,
    store: rootStore,
    additionalEnvelopPlugins,
    importCodes,
    codes,
    fetchFn,
  };
}
