import { path as pathModule, process } from '@graphql-mesh/cross-helpers';
import type { MeshResolvedSource } from '@graphql-mesh/runtime';
import {
  ImportFn,
  Logger,
  MeshHandlerLibrary,
  MeshMerger,
  MeshMergerLibrary,
  MeshPluginFactory,
  MeshPubSub,
  MeshTransform,
  MeshTransformLibrary,
  YamlConfig,
  KeyValueCache,
} from '@graphql-mesh/types';
import { IResolvers, Source } from '@graphql-tools/utils';
import { concatAST, DocumentNode, print, visit } from 'graphql';
import {
  getPackage,
  resolveAdditionalTypeDefs,
  resolveCache,
  resolvePubSub,
  resolveDocuments,
  resolveLogger,
} from './utils';
import { FsStoreStorageAdapter, MeshStore, InMemoryStoreStorageAdapter } from '@graphql-mesh/store';
import { pascalCase } from 'pascal-case';
import { camelCase } from 'camel-case';
import { defaultImportFn, parseWithCache, resolveAdditionalResolvers } from '@graphql-mesh/utils';
import { envelop, useMaskedErrors, useImmediateIntrospection } from '@envelop/core';

const ENVELOP_CORE_PLUGINS_MAP = {
  maskedErrors: {
    moduleName: '@envelop/core',
    importName: 'useMaskedErrors',
    pluginFactory: useMaskedErrors,
  },
  immediateIntrospection: {
    moduleName: '@envelop/core',
    importName: 'useImmediateIntrospection',
    pluginFactory: useImmediateIntrospection,
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
};

type EnvelopPlugins = Parameters<typeof envelop>[0]['plugins'];

export type ProcessedConfig = {
  sources: MeshResolvedSource[];
  transforms: MeshTransform[];
  additionalTypeDefs: DocumentNode[];
  additionalResolvers: IResolvers[];
  cache: KeyValueCache<string>;
  merger: MeshMerger;
  pubsub: MeshPubSub;
  config: YamlConfig.Config;
  documents: Source[];
  logger: Logger;
  store: MeshStore;
  code: string;
  additionalEnvelopPlugins: EnvelopPlugins;
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

  const importCodes: string[] = [
    `import type { GetMeshOptions } from '@graphql-mesh/runtime';`,
    `import type { YamlConfig } from '@graphql-mesh/types';`,
  ];
  const codes: string[] = [
    `export const rawServeConfig: YamlConfig.Config['serve'] = ${JSON.stringify(config.serve)} as any`,
    `export async function getMeshOptions(): Promise<GetMeshOptions> {`,
  ];

  const {
    dir,
    importFn = defaultImportFn,
    store: providedStore,
    artifactsDir,
    additionalPackagePrefixes,
  } = options || {};

  if (config.require) {
    await Promise.all(config.require.map(mod => importFn(mod)));
    for (const mod of config.require) {
      importCodes.push(`import '${mod}';`);
    }
  }

  const rootStore = providedStore || getDefaultMeshStore(dir, importFn, artifactsDir || '.mesh');

  const {
    pubsub,
    importCode: pubsubImportCode,
    code: pubsubCode,
  } = await resolvePubSub(config.pubsub, importFn, dir, additionalPackagePrefixes);
  importCodes.push(pubsubImportCode);
  codes.push(pubsubCode);

  const {
    cache,
    importCode: cacheImportCode,
    code: cacheCode,
  } = await resolveCache(config.cache, importFn, rootStore, dir, pubsub, additionalPackagePrefixes);
  importCodes.push(cacheImportCode);
  codes.push(cacheCode);

  const sourcesStore = rootStore.child('sources');
  codes.push(`const sourcesStore = rootStore.child('sources');`);

  const {
    logger,
    importCode: loggerImportCode,
    code: loggerCode,
  } = await resolveLogger(config.logger, importFn, dir, additionalPackagePrefixes, options?.initialLoggerPrefix);
  importCodes.push(loggerImportCode);
  codes.push(loggerCode);

  codes.push(`const sources = [];`);
  codes.push(`const transforms = [];`);
  codes.push(`const additionalEnvelopPlugins = [];`);

  const mergerName = config.merger || (config.sources.length > 1 ? 'stitching' : 'bare');

  const [sources, transforms, additionalEnvelopPlugins, additionalTypeDefs, additionalResolvers, merger, documents] =
    await Promise.all([
      Promise.all(
        config.sources.map<Promise<MeshResolvedSource>>(async (source, sourceIndex) => {
          const handlerName = Object.keys(source.handler)[0].toString();
          const handlerConfig = source.handler[handlerName];
          const handlerVariableName = camelCase(`${source.name}_Handler`);
          const transformsVariableName = camelCase(`${source.name}_Transforms`);
          codes.push(`const ${transformsVariableName} = [];`);
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
                importCodes.push(`import ${handlerImportName} from ${JSON.stringify(moduleName)}`);
                codes.push(`const ${handlerVariableName} = new ${handlerImportName}({
              name: ${JSON.stringify(source.name)},
              config: ${JSON.stringify(handlerConfig)},
              baseDir,
              cache,
              pubsub,
              store: sourcesStore.child(${JSON.stringify(source.name)}),
              logger: logger.child(${JSON.stringify(source.name)}),
              importFn
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
                  importCodes.push(`import ${transformImportName} from ${JSON.stringify(moduleName)};`);
                  codes.push(`${transformsVariableName}[${transformIndex}] = new ${transformImportName}({
                  apiName: ${JSON.stringify(source.name)},
                  config: ${JSON.stringify(transformConfig)},
                  baseDir,
                  cache,
                  pubsub,
                  importFn
                });`);
                }

                return new TransformCtor({
                  apiName: source.name,
                  config: transformConfig,
                  baseDir: dir,
                  cache,
                  pubsub,
                  importFn,
                });
              })
            ),
          ]);

          if (options.generateCode) {
            codes.push(`sources[${sourceIndex}] = {
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
            importCodes.push(`import ${transformImportName} from ${JSON.stringify(moduleName)};`);

            codes.push(`transforms[${transformIndex}] = new (${transformImportName} as any)({
            apiName: '',
            config: ${JSON.stringify(transformConfig)},
            baseDir,
            cache,
            pubsub,
            importFn
          })`);
          }
          return new TransformLibrary({
            apiName: '',
            config: transformConfig,
            baseDir: dir,
            cache,
            pubsub,
            importFn,
          });
        }) || []
      ),
      Promise.all(
        config.plugins?.map(async (p, pluginIndex) => {
          const pluginName = Object.keys(p)[0].toString();
          const pluginConfig = p[pluginName];
          if (ENVELOP_CORE_PLUGINS_MAP[pluginName] != null) {
            const { importName, moduleName, pluginFactory } = ENVELOP_CORE_PLUGINS_MAP[pluginName];
            if (options.generateCode) {
              importCodes.push(`import { ${importName} } from ${JSON.stringify(moduleName)};`);
              codes.push(
                `additionalEnvelopPlugins[${pluginIndex}] = ${importName}(${JSON.stringify(pluginConfig, null, 2)}))`
              );
            }
            return pluginFactory(pluginConfig);
          }
          let importName: string;
          const { resolved: possiblePluginFactory, moduleName } = await getPackage<any>({
            name: pluginName,
            type: 'plugin',
            importFn,
            cwd: dir,
            additionalPrefixes: [...additionalPackagePrefixes, '@envelop/'],
          });
          let pluginFactory: MeshPluginFactory<YamlConfig.Plugin[keyof YamlConfig.Plugin]>;
          if (typeof possiblePluginFactory === 'function') {
            pluginFactory = possiblePluginFactory;
            if (options.generateCode) {
              importName = pascalCase('use_' + pluginName);
              importCodes.push(`import ${importName} from ${JSON.stringify(moduleName)};`);
              codes.push(`additionalEnvelopPlugins[${pluginIndex}] = ${importName}({
          ...(${JSON.stringify(pluginConfig, null, 2)}),
          logger: logger.child(${JSON.stringify(pluginName)}),
        })`);
            }
          } else {
            Object.keys(possiblePluginFactory).forEach(key => {
              if (key.toString().startsWith('use') && typeof possiblePluginFactory[key] === 'function') {
                pluginFactory = possiblePluginFactory[key];
                if (options.generateCode) {
                  importCodes.push(`import { ${importName} } from ${JSON.stringify(moduleName)};`);
                  codes.push(
                    `additionalEnvelopPlugins[${pluginIndex}] = ${importName}(${JSON.stringify(pluginConfig, null, 2)}]`
                  );
                }
              }
            });
          }
          return pluginFactory({
            ...pluginConfig,
            logger: logger.child(pluginName),
          });
        }) || []
      ),
      resolveAdditionalTypeDefs(dir, config.additionalTypeDefs).then(additionalTypeDefs => {
        if (options.generateCode) {
          codes.push(
            `const additionalTypeDefs = [${(additionalTypeDefs || []).map(
              parsedTypeDefs => `parse(${JSON.stringify(print(parsedTypeDefs))}),`
            )}] as any[];`
          );
          if (additionalTypeDefs?.length) {
            importCodes.push(`import { parse } from 'graphql';`);
          }
        }
        return additionalTypeDefs;
      }),
      options?.ignoreAdditionalResolvers
        ? []
        : resolveAdditionalResolvers(dir, config.additionalResolvers, importFn, pubsub),
      getPackage<MeshMergerLibrary>({
        name: mergerName,
        type: 'merger',
        importFn,
        cwd: dir,
        additionalPrefixes: additionalPackagePrefixes,
      }).then(({ resolved: Merger, moduleName }) => {
        if (options.generateCode) {
          const mergerImportName = pascalCase(`${mergerName}Merger`);
          importCodes.push(`import ${mergerImportName} from ${JSON.stringify(moduleName)};`);
          codes.push(`const merger = new(${mergerImportName} as any)({
        cache,
        pubsub,
        logger: logger.child('${mergerName}Merger'),
        store: rootStore.child('${mergerName}Merger')
      })`);
        }
        return new Merger({
          cache,
          pubsub,
          logger: logger.child(`${mergerName}Merger`),
          store: rootStore.child(`${mergerName}Merger`),
        });
      }),
      resolveDocuments(config.documents, dir),
    ]);

  if (options.generateCode) {
    if (config.additionalResolvers?.length) {
      importCodes.push(`import { resolveAdditionalResolversWithoutImport } from '@graphql-mesh/utils';`);

      codes.push(`const additionalResolvers = await Promise.all([
        ${config.additionalResolvers
          .map(additionalResolverDefinition => {
            if (typeof additionalResolverDefinition === 'string') {
              return `import(${JSON.stringify(
                pathModule.join('..', additionalResolverDefinition).split('\\').join('/')
              )})
            .then(m => m.resolvers || m.default || m)`;
            } else {
              return `resolveAdditionalResolversWithoutImport(
            ${JSON.stringify(additionalResolverDefinition, null, 2)}
          )`;
            }
          })
          .join(',\n')}
      ]);`);
    } else {
      codes.push(`const additionalResolvers = [] as any[]`);
    }
  }

  if (config.additionalEnvelopPlugins) {
    codes.push(
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
          codes.push(`additionalEnvelopPlugins.push(...(await importedAdditionalEnvelopPlugins()));`);
        }
        additionalEnvelopPlugins.push(...factoryResult);
      } else {
        if (options.generateCode) {
          codes.push(`additionalEnvelopPlugins.push(await importedAdditionalEnvelopPlugins());`);
        }
        additionalEnvelopPlugins.push(factoryResult);
      }
    } else {
      if (Array.isArray(importedAdditionalEnvelopPlugins)) {
        if (options.generateCode) {
          codes.push(`additionalEnvelopPlugins.push(...importedAdditionalEnvelopPlugins)`);
        }
        additionalEnvelopPlugins.push(...importedAdditionalEnvelopPlugins);
      } else {
        if (options.generateCode) {
          codes.push(`additionalEnvelopPlugins.push(importedAdditionalEnvelopPlugins)`);
        }
        additionalEnvelopPlugins.push(importedAdditionalEnvelopPlugins);
      }
    }
  }

  if (options.generateCode) {
    importCodes.push(`import { printWithCache } from '@graphql-mesh/utils';`);
    const documentVariableNames: string[] = [];
    if (documents?.length) {
      const allDocumentNodes: DocumentNode = concatAST(
        documents.map(document => document.document || parseWithCache(document.rawSDL))
      );
      visit(allDocumentNodes, {
        OperationDefinition(node) {
          documentVariableNames.push(pascalCase(node.name.value + '_Document'));
        },
      });
    }

    codes.push(`
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
    code: [...new Set([...importCodes, ...codes])].join('\n'),
  };
}
