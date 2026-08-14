import kebabCase from 'lodash.kebabcase';
import type { YamlConfig } from '@graphql-mesh/types';

export type MigrationMessage = {
  level: 'error' | 'warn' | 'info';
  message: string;
};

export type ResolvedPluginImport = {
  moduleName: string;
  importName: string;
  factoryName: string;
};

export type ResolveLegacyPlugin = (args: {
  name: string;
  cwd?: string;
}) => Promise<ResolvedPluginImport | undefined>;

export interface MigrateLegacyConfigOptions {
  cwd?: string;
  resolvePlugin?: ResolveLegacyPlugin;
}

export interface MigrateLegacyConfigResult {
  code: string;
  addedPackages: string[];
  removedPackages: string[];
  messages: MigrationMessage[];
  fatal: boolean;
}

export async function migrateLegacyConfig(
  legacyConfig: YamlConfig.Config,
  options: MigrateLegacyConfigOptions = {},
): Promise<MigrateLegacyConfigResult> {
  const messages: MigrationMessage[] = [];
  let fatal = false;
  const importMap = new Map<string, Set<string>>();
  const addedPackages = new Set<string>(['@graphql-hive/gateway', '@graphql-mesh/compose-cli']);
  const removedPackages = new Set<string>(['@graphql-mesh/cli']);

  const subgraphConfigList: string[] = [];
  for (const legacySource of legacyConfig.sources ?? []) {
    const handlerName = String(Object.keys(legacySource.handler)[0]);
    if (handlerName === 'supergraph') {
      messages.push({
        level: 'error',
        message:
          'The "supergraph" handler does not need Mesh Compose. Serve the supergraph with Hive Gateway instead: https://the-guild.dev/graphql/hive/docs/gateway',
      });
      fatal = true;
      continue;
    }
    const handlerInfo = handlerInfoMap[handlerName];
    if (!handlerInfo) {
      messages.push({
        level: 'error',
        message: `Handler "${handlerName}" is not supported by mesh-migrate-config. See the v0 migration guide for the source-handler mapping, then migrate this source manually.`,
      });
      fatal = true;
      continue;
    }
    addImport(importMap, handlerInfo.packageName, handlerInfo.importName);
    removedPackages.add(handlerInfo.oldPackageName);
    addedPackages.add(handlerInfo.packageName);

    const mappedHandler = mapHandlerConfig(
      handlerName,
      legacySource.handler[handlerName],
      messages,
    );
    if (mappedHandler === undefined) {
      fatal = true;
      continue;
    }

    const subgraphFields: string[] = [
      `sourceHandler: ${handlerInfo.importName}(${JSON.stringify(legacySource.name)}, ${JSON.stringify(mappedHandler)})`,
    ];
    if (legacySource.transforms?.length) {
      const transformExprs: string[] = [];
      for (const transform of legacySource.transforms) {
        const expr = handleTransformConfiguration(importMap, transform, messages);
        if (expr) {
          transformExprs.push(expr);
        } else {
          fatal = true;
        }
      }
      if (transformExprs.length) {
        subgraphFields.push(`transforms: [\n${transformExprs.join(',\n')}\n]`);
      }
    }
    subgraphConfigList.push(`{\n${subgraphFields.join(',\n')}\n}`);
  }

  const composeConfigList: string[] = [];
  if (subgraphConfigList.length) {
    composeConfigList.push(`subgraphs: [\n${subgraphConfigList.join(',\n')}\n]`);
  }
  if (legacyConfig.additionalTypeDefs) {
    composeConfigList.push(
      `additionalTypeDefs: ${JSON.stringify(legacyConfig.additionalTypeDefs)}`,
    );
  }
  if (legacyConfig.transforms?.length) {
    messages.push({
      level: 'error',
      message:
        'Root-level transforms are not supported in Mesh Compose. Move them onto the relevant source, or replace stitching/type-merging with the Federation transform.',
    });
    fatal = true;
  }
  if (legacyConfig.customFetch) {
    const [packageName, importName = 'default'] = String(legacyConfig.customFetch).split('#');
    addImport(importMap, packageName, `${importName} as customFetch`);
    composeConfigList.push(`fetch: customFetch`);
  }
  if (legacyConfig.merger) {
    messages.push({
      level: 'warn',
      message:
        'The "merger" option is gone in Mesh v1. Composition uses Federation-compatible supergraphs; see Type Merging / Federation transform in the v1 docs.',
    });
  }
  if (legacyConfig.documents?.length) {
    messages.push({
      level: 'warn',
      message:
        '"documents" is no longer part of Mesh config. Point GraphQL Codegen or your gateway persisted-documents setup at those files instead.',
    });
  }

  addImport(importMap, '@graphql-mesh/compose-cli', 'defineConfig as defineComposeConfig');

  const sideEffectStatements: string[] = [];
  const composeConfig = `export const composeConfig = defineComposeConfig({
${composeConfigList.join(',\n')}
});`;

  const serveConfigList: string[] = [];
  const pluginList: string[] = [];

  if (legacyConfig.additionalEnvelopPlugins) {
    const [packageName, importName = 'default'] = legacyConfig.additionalEnvelopPlugins.split('#');
    addImport(importMap, packageName, `${importName} as additionalEnvelopPlugins`);
    pluginList.push(`...additionalEnvelopPlugins`);
  }
  if (legacyConfig.additionalResolvers) {
    const additionalResolversNewConfig: string[] = [];
    const additionalResolversConfigs = Array.isArray(legacyConfig.additionalResolvers)
      ? legacyConfig.additionalResolvers
      : [legacyConfig.additionalResolvers];
    for (const additionalResolversConfigIndex in additionalResolversConfigs) {
      const additionalResolversConfig = additionalResolversConfigs[additionalResolversConfigIndex];
      if (typeof additionalResolversConfig === 'string') {
        const importNameAlias = `additionalResolvers$${additionalResolversConfigIndex}`;
        const [packageName, importName = 'default'] = additionalResolversConfig.split('#');
        addImport(importMap, packageName, `${importName} as ${importNameAlias}`);
        additionalResolversNewConfig.push(importNameAlias);
      } else if (typeof additionalResolversConfig === 'object') {
        additionalResolversNewConfig.push(JSON.stringify(additionalResolversConfig));
      }
    }
    serveConfigList.push(`additionalResolvers: [
${additionalResolversNewConfig.join(',\n')}
]`);
  }
  if (legacyConfig.cache) {
    const cacheName = Object.keys(legacyConfig.cache)[0].toString();
    const packageName = `@graphql-mesh/cache-${kebabCase(cacheName)}`;
    const cacheConfig = legacyConfig.cache[cacheName];
    addImport(importMap, packageName, 'default as Cache');
    addedPackages.add(packageName);
    serveConfigList.push(`cache: new Cache(${JSON.stringify(cacheConfig)})`);
  }
  if (legacyConfig.codegen) {
    messages.push({
      level: 'warn',
      message:
        'Mesh no longer runs GraphQL Code Generator. Configure @graphql-codegen/cli separately if you need types or documents.',
    });
  }
  if (legacyConfig.customFetch) {
    const [packageName, importName = 'default'] = String(legacyConfig.customFetch).split('#');
    addImport(importMap, packageName, `${importName} as customFetch`);
    serveConfigList.push(`fetchAPI: { fetch: customFetch }`);
  }
  if (legacyConfig.logger) {
    const [packageName, importName = 'default'] = legacyConfig.logger.split('#');
    addImport(importMap, packageName, `${importName} as logger`);
    serveConfigList.push(`logger`);
  }
  if (legacyConfig.pubsub) {
    messages.push({
      level: 'warn',
      message:
        'PubSub config cannot be migrated automatically. See Hive Gateway pubsub / subscriptions docs.',
    });
  }
  if (legacyConfig.persistedOperations) {
    messages.push({
      level: 'warn',
      message:
        'Persisted operations cannot be migrated automatically. See https://the-guild.dev/graphql/hive/docs/gateway/persisted-documents',
    });
  }
  if (legacyConfig.plugins) {
    for (const legacyPluginConfig of legacyConfig.plugins) {
      const legacyPluginName = Object.keys(legacyPluginConfig)[0];
      if (legacyPluginName === 'maskedErrors') {
        const maskedErrorsConfig = legacyPluginConfig[legacyPluginName];
        if (typeof maskedErrorsConfig === 'boolean') {
          serveConfigList.push(`maskedErrors: ${maskedErrorsConfig}`);
        } else {
          serveConfigList.push(`maskedErrors: ${JSON.stringify(maskedErrorsConfig)}`);
        }
      } else if (legacyPluginName === 'immediateIntrospection') {
        addImport(importMap, '@envelop/core', 'useImmediateIntrospection');
        addedPackages.add('@envelop/core');
        pluginList.push('useImmediateIntrospection()');
      } else if (legacyPluginName === 'hive') {
        const { persistedDocuments, ...hiveConfig } = legacyPluginConfig[legacyPluginName];
        serveConfigList.push(
          `reporting: ${JSON.stringify({
            type: 'hive',
            ...hiveConfig,
          })}`,
        );
        if (persistedDocuments) {
          serveConfigList.push(
            `persistedDocuments: ${JSON.stringify({
              type: 'hive',
              ...persistedDocuments,
            })}`,
          );
        }
      } else if (legacyPluginName === 'prometheus') {
        serveConfigList.push(`prometheus: ${JSON.stringify(legacyPluginConfig[legacyPluginName])}`);
      } else if (legacyPluginName === 'rateLimit') {
        serveConfigList.push(
          `rateLimiting: ${JSON.stringify(legacyPluginConfig[legacyPluginName])}`,
        );
      } else if (legacyPluginName === 'responseCache') {
        serveConfigList.push(
          `responseCaching: ${JSON.stringify(legacyPluginConfig[legacyPluginName])}`,
        );
      } else if (options.resolvePlugin) {
        const resolved = await options.resolvePlugin({
          name: legacyPluginName.toString(),
          cwd: options.cwd,
        });
        if (!resolved) {
          messages.push({
            level: 'warn',
            message: `Plugin "${legacyPluginName}" could not be resolved. Add it to gatewayConfig.plugins manually.`,
          });
          continue;
        }
        addImport(importMap, resolved.moduleName, resolved.importName);
        addedPackages.add(resolved.moduleName);
        const pluginConfig = legacyPluginConfig[legacyPluginName];
        const pluginOpts =
          pluginConfig != null && typeof pluginConfig === 'object' && !Array.isArray(pluginConfig)
            ? `,\n...${JSON.stringify(pluginConfig)}`
            : '';
        pluginList.push(`${resolved.factoryName}({
          ...ctx${pluginOpts}
        })`);
      } else {
        messages.push({
          level: 'warn',
          message: `Plugin "${legacyPluginName}" is not a built-in gateway option. Map it to a Hive Gateway / Envelop plugin manually.`,
        });
      }
    }
  }
  if (legacyConfig.pollingInterval) {
    serveConfigList.push(`pollingInterval: ${legacyConfig.pollingInterval}`);
  }
  if (legacyConfig.require) {
    for (const requiredPackage of legacyConfig.require) {
      sideEffectStatements.push(`import '${requiredPackage}';`);
    }
  }
  if (legacyConfig.sdk) {
    messages.push({
      level: 'warn',
      message:
        'Mesh no longer generates SDKs. Use GraphQL Codegen (e.g. client-preset or graphql-request) instead.',
    });
  }
  if (legacyConfig.serve) {
    if (legacyConfig.serve.batchingLimit) {
      serveConfigList.push(`batching: {
        limit: ${legacyConfig.serve.batchingLimit}
      }`);
    }
    if (legacyConfig.serve.cors) {
      serveConfigList.push(`cors: ${JSON.stringify(legacyConfig.serve.cors)}`);
    }
    if (legacyConfig.serve.endpoint) {
      serveConfigList.push(`graphqlEndpoint: ${JSON.stringify(legacyConfig.serve.endpoint)}`);
    }
    if (legacyConfig.serve.extraParamNames) {
      messages.push({
        level: 'warn',
        message:
          'serve.extraParamNames cannot be migrated automatically. Configure extra GraphQL request parameters on Hive Gateway if you still need them.',
      });
    }
    if (legacyConfig.serve.fork) {
      serveConfigList.push(`fork: ${legacyConfig.serve.fork}`);
    }
    if (legacyConfig.serve.healthCheckEndpoint) {
      serveConfigList.push(
        `healthCheckEndpoint: ${JSON.stringify(legacyConfig.serve.healthCheckEndpoint)}`,
      );
    }
    if (legacyConfig.serve.hostname) {
      serveConfigList.push(`host: ${JSON.stringify(legacyConfig.serve.hostname)}`);
    }
    if (legacyConfig.serve.playground === false && !legacyConfig.serve.playgroundTitle) {
      serveConfigList.push(`graphiql: false`);
    }
    if (legacyConfig.serve.playgroundTitle) {
      serveConfigList.push(`graphiql: {
        title: ${JSON.stringify(legacyConfig.serve.playgroundTitle)}
        }`);
    }
    if (legacyConfig.serve.port) {
      serveConfigList.push(`port: ${legacyConfig.serve.port}`);
    }
    if (legacyConfig.serve.sslCredentials) {
      serveConfigList.push(`sslCredentials: ${JSON.stringify(legacyConfig.serve.sslCredentials)}`);
    }
    if (legacyConfig.serve.staticFiles) {
      addImport(importMap, '@graphql-hive/gateway', 'useStaticFiles');
      pluginList.push(`useStaticFiles(${JSON.stringify(legacyConfig.serve.staticFiles)})`);
    }
    if (legacyConfig.serve.browser != null) {
      messages.push({
        level: 'warn',
        message:
          'serve.browser (auto-open playground) is not part of Hive Gateway config and was skipped.',
      });
    }
  }
  if (legacyConfig.skipSSLValidation) {
    sideEffectStatements.push(`process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';`);
  }
  if (pluginList.length) {
    serveConfigList.push(`plugins: ctx => ([
${pluginList.join(',\n')}
])`);
  }
  addImport(importMap, '@graphql-hive/gateway', 'defineConfig as defineGatewayConfig');
  const serveInner = serveConfigList.length ? `\n${serveConfigList.join(',\n')}\n` : '';
  const serveConfig = `export const gatewayConfig = defineGatewayConfig({${serveInner}});`;
  const namedImports: string[] = [];
  for (const [packageName, imports] of importMap) {
    namedImports.push(`import { ${Array.from(imports).join(', ')} } from '${packageName}';`);
  }
  const tlsSideEffects = sideEffectStatements.filter(s => s.startsWith('process.env.'));
  const requireImports = sideEffectStatements.filter(s => s.startsWith('import '));
  const configList = [
    ...requireImports,
    ...namedImports,
    ...tlsSideEffects,
    composeConfig,
    serveConfig,
  ];

  return {
    code: configList.join('\n'),
    addedPackages: Array.from(addedPackages),
    removedPackages: Array.from(removedPackages),
    messages,
    fatal,
  };
}

function addImport(importMap: Map<string, Set<string>>, packageName: string, importName: string) {
  let set = importMap.get(packageName);
  if (!set) {
    set = new Set();
    importMap.set(packageName, set);
  }
  set.add(importName);
}

function mapHandlerConfig(
  handlerName: string,
  handlerConfig: any,
  messages: MigrationMessage[],
): unknown | undefined {
  if (handlerName !== 'graphql' || handlerConfig == null || typeof handlerConfig !== 'object') {
    return handlerConfig;
  }
  if ('sources' in handlerConfig) {
    messages.push({
      level: 'error',
      message:
        'GraphQL handler "sources" (fallback/race/highestValue) is not generated by mesh-migrate-config. Split them into separate subgraphs or keep a single endpoint.',
    });
    return undefined;
  }
  if (!('endpoint' in handlerConfig) && 'source' in handlerConfig) {
    const { source, ...rest } = handlerConfig;
    return { endpoint: source, ...rest };
  }
  return handlerConfig;
}

const handlerInfoMap: Record<
  string,
  { packageName: string; oldPackageName: string; importName: string }
> = {
  graphql: {
    packageName: '@graphql-mesh/compose-cli',
    oldPackageName: '@graphql-mesh/graphql',
    importName: 'loadGraphQLHTTPSubgraph',
  },
  grpc: {
    packageName: '@omnigraph/grpc',
    oldPackageName: '@graphql-mesh/grpc',
    importName: 'loadGRPCSubgraph',
  },
  jsonSchema: {
    packageName: '@omnigraph/json-schema',
    oldPackageName: '@graphql-mesh/json-schema',
    importName: 'loadJSONSchemaSubgraph',
  },
  mongoose: {
    packageName: '@omnigraph/mongoose',
    oldPackageName: '@graphql-mesh/mongoose',
    importName: 'loadMongooseSubgraph',
  },
  mysql: {
    packageName: '@omnigraph/mysql',
    oldPackageName: '@graphql-mesh/mysql',
    importName: 'loadMySQLSubgraph',
  },
  neo4j: {
    packageName: '@omnigraph/neo4j',
    oldPackageName: '@graphql-mesh/neo4j',
    importName: 'loadNeo4jSubgraph',
  },
  odata: {
    packageName: '@omnigraph/odata',
    oldPackageName: '@graphql-mesh/odata',
    importName: 'loadODataSubgraph',
  },
  postgraphile: {
    packageName: '@omnigraph/postgresql',
    oldPackageName: '@graphql-mesh/postgraphile',
    importName: 'loadPostgreSQLSubgraph',
  },
  raml: {
    packageName: '@omnigraph/raml',
    oldPackageName: '@graphql-mesh/raml',
    importName: 'loadRAMLSubgraph',
  },
  openapi: {
    packageName: '@omnigraph/openapi',
    oldPackageName: '@graphql-mesh/openapi',
    importName: 'loadOpenAPISubgraph',
  },
  soap: {
    packageName: '@omnigraph/soap',
    oldPackageName: '@graphql-mesh/soap',
    importName: 'loadSOAPSubgraph',
  },
  thrift: {
    packageName: '@omnigraph/thrift',
    oldPackageName: '@graphql-mesh/thrift',
    importName: 'loadThriftSubgraph',
  },
  tuql: {
    packageName: '@omnigraph/sqlite',
    oldPackageName: '@graphql-mesh/tuql',
    importName: 'loadSQLiteSubgraph',
  },
};

type TransformInfo =
  { fnName: string; mapConfig?: (config: unknown) => unknown } | { deprecated: string };

const transformInfoMap: Record<string, TransformInfo> = {
  cache: {
    deprecated:
      'Cache Transform has been removed. Use the Hive Gateway response caching plugin (`responseCaching`) instead.',
  },
  encapsulate: {
    fnName: 'createEncapsulateTransform',
  },
  extend: {
    fnName: 'createExtendTransform',
    mapConfig(config) {
      if (config && typeof config === 'object' && 'typeDefs' in (config as object)) {
        return (config as YamlConfig.ExtendTransform).typeDefs;
      }
      return config;
    },
  },
  federation: {
    fnName: 'createFederationTransform',
  },
  filterSchema: {
    fnName: 'createFilterTransform',
    mapConfig(config) {
      if (Array.isArray(config)) {
        return { filters: config };
      }
      if (config && typeof config === 'object') {
        const { mode: _mode, ...rest } = config as Record<string, unknown>;
        return rest;
      }
      return config;
    },
  },
  hoistField: {
    fnName: 'createHoistFieldTransform',
    mapConfig(config) {
      if (Array.isArray(config)) {
        return { mapping: config };
      }
      return config;
    },
  },
  namingConvention: {
    fnName: 'createNamingConventionTransform',
  },
  prefix: {
    fnName: 'createPrefixTransform',
  },
  prune: {
    fnName: 'createPruneTransform',
  },
  rateLimit: {
    deprecated:
      'RateLimit Transform has been removed. Use Hive Gateway `rateLimiting` instead of a schema transform.',
  },
  rename: {
    fnName: 'createRenameTransform',
  },
  replaceField: {
    deprecated:
      'ReplaceField Transform has been removed. Use Hoist Field, Rename, or additionalTypeDefs instead.',
  },
  resolversComposition: {
    deprecated:
      'ResolversComposition Transform has been removed. Use additionalResolvers on the gateway or a custom plugin.',
  },
  typeMerging: {
    deprecated:
      'TypeMerging Transform has been removed. Use the Federation transform (`createFederationTransform`) instead.',
  },
};

function handleTransformConfiguration(
  importMap: Map<string, Set<string>>,
  transformConfiguration: YamlConfig.Transform,
  messages: MigrationMessage[],
): string | undefined {
  const transformName = Object.keys(transformConfiguration)[0];
  const transformConfig = transformConfiguration[transformName];
  const transformInfo = transformInfoMap[transformName];
  if (!transformInfo) {
    messages.push({
      level: 'error',
      message: `Transform "${transformName}" is not recognized by mesh-migrate-config. Migrate it manually.`,
    });
    return undefined;
  }
  if ('deprecated' in transformInfo) {
    messages.push({
      level: 'error',
      message: transformInfo.deprecated,
    });
    return undefined;
  }
  addImport(importMap, '@graphql-mesh/compose-cli', transformInfo.fnName);
  const mapped =
    'mapConfig' in transformInfo && transformInfo.mapConfig
      ? transformInfo.mapConfig(transformConfig)
      : transformConfig;
  if (
    transformName === 'extend' &&
    transformConfig &&
    typeof transformConfig === 'object' &&
    'resolvers' in transformConfig &&
    (transformConfig as YamlConfig.ExtendTransform).resolvers
  ) {
    messages.push({
      level: 'warn',
      message:
        'extend.resolvers cannot be applied as a compose transform. Move those resolvers to gatewayConfig.additionalResolvers.',
    });
  }
  if (mapped === undefined || mapped === null) {
    return `${transformInfo.fnName}()`;
  }
  return `${transformInfo.fnName}(${JSON.stringify(mapped)})`;
}
