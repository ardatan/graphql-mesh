// eslint-disable-next-line import/no-nodejs-modules
import { writeFileSync } from 'node:fs';
// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'node:path';
import kebabCase from 'lodash.kebabcase';
import { format } from 'prettier';
import { findConfig } from '@graphql-mesh/cli';
import { camelCase } from '@graphql-mesh/compose-cli';
import { getPackage } from '@graphql-mesh/config';
import type { YamlConfig } from '@graphql-mesh/types';
import { defaultImportFn } from '@graphql-mesh/utils';

export async function run() {
  const cwd = process.argv[2] || process.cwd();
  const {
    config: legacyConfig,
    filepath,
    isEmpty,
  }: {
    config?: YamlConfig.Config;
    filepath?: string;
    isEmpty?: boolean;
  } = await findConfig({
    initialLoggerPrefix: 'Mesh Config Migrate',
    dir: cwd,
  });
  if (isEmpty) {
    console.error('No config file found');
    process.exit(1);
  }
  if (!legacyConfig) {
    console.error('No config found');
    process.exit(1);
  }
  console.log(`Found config at ${filepath}`);

  // Create compose configuration
  const importMap = new Map<string, Set<string>>();
  const addedPackages = new Set<string>(['@graphql-hive/gateway', '@graphql-mesh/compose-cli']);
  const removedPackages = new Set<string>(['@graphql-mesh/cli']);

  // Prepare Compose Configuration
  const subgraphConfigList = new Set<string>();
  for (const legacySource of legacyConfig.sources) {
    const handlerName = Object.keys(legacySource.handler)[0];
    if (handlerName === 'supergraph') {
      console.error(
        `If you use "supergraph" handler, you probably don't need to use Mesh Compose,
check Hive Gateway's docs to consume a supergraph.`,
      );
      process.exit(1);
    }
    const handlerConfig = legacySource.handler[handlerName];
    const handlerInfo = handlerInfoMap[handlerName];
    if (!handlerInfo) {
      console.error(
        `Handler ${handlerName} is not supported currently in Mesh Migrate CLI, please do the migration manually.`,
      );
      process.exit(1);
    }
    addImport(importMap, handlerInfo.packageName, handlerInfo.importName);
    removedPackages.add(handlerInfo.oldPackageName);
    addedPackages.add(handlerInfo.packageName);
    const subgraphConfigContent = new Set<string>();
    subgraphConfigContent.add(`
      sourceHandler: ${handlerInfo.importName}(${JSON.stringify(legacySource.name)},
        ${JSON.stringify(handlerConfig)}
      )
      `);
    if (legacySource.transforms?.length) {
      subgraphConfigContent.add(`transforms: [
          ${legacySource.transforms.map(transform => handleTransformConfiguration(importMap, transform)).join(',\n')}
        ]`);
    }
    subgraphConfigList.add(`{
      ${Array.from(subgraphConfigContent).join(',\n')}
      }`);
  }
  const subgraphsConfig = `
    subgraphs: [
      ${Array.from(subgraphConfigList).join(',\n')}
    ]
  `;

  const composeConfigList = new Set<string>();
  composeConfigList.add(subgraphsConfig);
  if (legacyConfig.additionalTypeDefs) {
    composeConfigList.add(
      `additionalTypeDefs: ${JSON.stringify(legacyConfig.additionalTypeDefs)},`,
    );
  }
  if (legacyConfig.transforms) {
    console.error(
      'Root level transforms are not supported in Mesh Compose CLI! Please source level transforms instead!',
    );
    process.exit(1);
  }
  if (legacyConfig.customFetch) {
    const [packageName, importName = 'default'] = legacyConfig.customFetch.split('#');
    addImport(importMap, packageName, `${importName} as customFetch`);
    composeConfigList.add(`fetch: customFetch,`);
  }

  addImport(importMap, '@graphql-mesh/compose-cli', 'defineConfig as defineComposeConfig');
  const configList = new Set<string>();
  const composeConfig = `
    export const composeConfig = defineComposeConfig({
      ${Array.from(composeConfigList).join(',\n')}
    });
  `;

  // Serve Configuration
  const serveConfigList = new Set<string>();
  const pluginList = new Set<string>();
  if (legacyConfig.additionalEnvelopPlugins) {
    const [packageName, importName = 'default'] = legacyConfig.additionalEnvelopPlugins.split('#');
    addImport(importMap, packageName, `${importName} as additionalEnvelopPlugins`);
    pluginList.add(`...additionalEnvelopPlugins`);
  }
  if (legacyConfig.additionalResolvers) {
    const additionalResolversNewConfig = new Set<string>();
    const additionalResolversConfigs = Array.isArray(legacyConfig.additionalResolvers)
      ? legacyConfig.additionalResolvers
      : [legacyConfig.additionalResolvers];
    for (const additionalResolversConfigIndex in additionalResolversConfigs) {
      const additionalResolversConfig = additionalResolversConfigs[additionalResolversConfigIndex];
      if (typeof additionalResolversConfig === 'string') {
        const importNameAlias = `additionalResolvers$${additionalResolversConfigIndex}`;
        const [packageName, importName = 'default'] = additionalResolversConfig.split('#');
        addImport(importMap, packageName, `${importName} as ${importNameAlias}`);
        additionalResolversNewConfig.add(importNameAlias);
      } else if (typeof additionalResolversConfig === 'object') {
        additionalResolversNewConfig.add(JSON.stringify(additionalResolversConfig));
      }
    }
    serveConfigList.add(`additionalResolvers: [
      ${Array.from(additionalResolversNewConfig).join(',\n')}
    ]`);
  }
  if (legacyConfig.cache) {
    const cacheName = Object.keys(legacyConfig.cache)[0].toString();
    const packageName = `@graphql-mesh/cache-${kebabCase(cacheName)}`;
    const cacheConfig = legacyConfig.cache[cacheName];
    addImport(importMap, packageName, 'default as Cache');
    serveConfigList.add(`cache: new Cache(${JSON.stringify(cacheConfig)})`);
  }
  if (legacyConfig.codegen) {
    console.warn(
      'Codegen is not available in Mesh Compose CLI! Please use GraphQL Codegen directly to generate types!',
    );
  }
  if (legacyConfig.customFetch) {
    const [packageName, importName = 'default'] = legacyConfig.customFetch.split('#');
    addImport(importMap, packageName, `${importName} as customFetch`);
    serveConfigList.add(`fetchAPI: { fetch: customFetch }`);
  }
  if (legacyConfig.logger) {
    const [packageName, importName = 'default'] = legacyConfig.logger.split('#');
    addImport(importMap, packageName, `${importName} as logger`);
    serveConfigList.add(`logger`);
  }
  if (legacyConfig.pubsub) {
    console.warn(
      'PubSub configuration cannot be migrated right now. Please check docs for PubSub configuration in Mesh Compose CLI!',
    );
  }
  if (legacyConfig.persistedOperations) {
    console.warn(
      'Persisted Operations configuration cannot be migrated right now. Please check docs for Persisted Operations configuration in Mesh Compose CLI!',
    );
  }
  if (legacyConfig.plugins) {
    for (const legacyPluginConfig of legacyConfig.plugins) {
      const legacyPluginName = Object.keys(legacyPluginConfig)[0];
      if (legacyPluginName === 'maskedErrors') {
        const maskedErrorsConfig = legacyPluginConfig[legacyPluginName];
        if (typeof maskedErrorsConfig === 'boolean') {
          serveConfigList.add(`maskedErrors: ${maskedErrorsConfig}`);
        } else {
          serveConfigList.add(`maskedErrors: ${JSON.stringify(maskedErrorsConfig)}`);
        }
      } else if (legacyPluginName === 'immediateIntrospection') {
        addImport(importMap, '@envelop/core', 'useImmediateIntrospection');
        pluginList.add('useImmediateIntrospection()');
      } else if (legacyPluginName === 'hive') {
        // eslint-disable-next-line camelcase
        const { experimental__persistedDocuments, ...hiveConfig } =
          legacyPluginConfig[legacyPluginName];
        serveConfigList.add(`
          reporting: ${JSON.stringify({
            type: 'hive',
            ...hiveConfig,
          })}
        `);
        // eslint-disable-next-line camelcase
        if (experimental__persistedDocuments) {
          serveConfigList.add(
            `persistedOperations: ${JSON.stringify({
              type: 'hive',
              // eslint-disable-next-line camelcase
              ...experimental__persistedDocuments,
            })}`,
          );
        }
      } else if (legacyPluginName === 'prometheus') {
        serveConfigList.add(`prometheus: ${JSON.stringify(legacyPluginConfig[legacyPluginName])}`);
      } else if (legacyPluginName === 'rateLimit') {
        serveConfigList.add(
          `rateLimiting: ${JSON.stringify(legacyPluginConfig[legacyPluginName])}`,
        );
      } else if (legacyPluginName === 'responseCache') {
        serveConfigList.add(
          `responseCaching: ${JSON.stringify(legacyPluginConfig[legacyPluginName])}`,
        );
      } else {
        const { resolved: possiblePluginFactory, moduleName } = await getPackage<any>({
          name: legacyPluginName.toString(),
          type: 'plugin',
          importFn: defaultImportFn,
          cwd,
          additionalPrefixes: ['@envelop/', '@graphql-yoga/plugin-', '@escape.tech/graphql-armor-'],
        });
        let importName: string;
        let fnName: string;
        if (typeof possiblePluginFactory === 'function') {
          fnName = camelCase(`use_${legacyPluginName}`);
          importName = `default as ${fnName}`;
        } else {
          importName = Object.keys(possiblePluginFactory)
            .find(
              iName =>
                (iName.toString().startsWith('use') || iName.toString().endsWith('Plugin')) &&
                typeof possiblePluginFactory[iName] === 'function',
            )
            .toString();
          fnName = importName;
        }
        addImport(importMap, moduleName, importName);
        pluginList.add(`${fnName}({
          ...ctx,
          ${JSON.stringify(legacyPluginConfig[legacyPluginName]).slice(1, -1)},
        })`);
      }
    }
  }
  if (legacyConfig.pollingInterval) {
    serveConfigList.add(`pollingInterval: ${legacyConfig.pollingInterval}`);
  }
  if (legacyConfig.require) {
    for (const requiredPackage of legacyConfig.require) {
      configList.add(`import '${requiredPackage}';`);
    }
  }
  if (legacyConfig.sdk) {
    console.warn(
      'Mesh no longer generates SDKs. Please use GraphQL Codegen to generate types and SDK!',
    );
  }
  if (legacyConfig.serve) {
    if (legacyConfig.serve.batchingLimit) {
      serveConfigList.add(`batching: {
        limit: ${legacyConfig.serve.batchingLimit}
      }`);
    }
    if (legacyConfig.serve.cors) {
      serveConfigList.add(`cors: ${JSON.stringify(legacyConfig.serve.cors)}`);
    }
    if (legacyConfig.serve.endpoint) {
      serveConfigList.add(`graphqlEndpoint: ${JSON.stringify(legacyConfig.serve.endpoint)}`);
    }
    if (legacyConfig.serve.extraParamNames) {
      console.warn(
        'Extra Param Names configuration cannot be migrated right now. Please check docs for Extra Param Names configuration in Mesh Compose CLI!',
      );
    }
    if (legacyConfig.serve.fork) {
      serveConfigList.add(`fork: ${legacyConfig.serve.fork}`);
    }
    if (legacyConfig.serve.healthCheckEndpoint) {
      serveConfigList.add(
        `healthCheckEndpoint: ${JSON.stringify(legacyConfig.serve.healthCheckEndpoint)}`,
      );
    }
    if (legacyConfig.serve.hostname) {
      serveConfigList.add(`host: ${JSON.stringify(legacyConfig.serve.hostname)}`);
    }
    if (legacyConfig.serve.playground === false) {
      serveConfigList.add(`graphiql: false`);
    }
    if (legacyConfig.serve.playgroundTitle) {
      serveConfigList.add(`graphiql: {
        title: ${JSON.stringify(legacyConfig.serve.playgroundTitle)}
        }`);
    }
    if (legacyConfig.serve.port) {
      serveConfigList.add(`port: ${legacyConfig.serve.port}`);
    }
    if (legacyConfig.serve.sslCredentials) {
      serveConfigList.add(`sslCredentials: ${JSON.stringify(legacyConfig.serve.sslCredentials)}`);
    }
    if (legacyConfig.serve.staticFiles) {
      addImport(importMap, '@graphql-hive/gateway', 'useStaticFiles');
      pluginList.add(`useStaticFiles(${JSON.stringify(legacyConfig.serve.staticFiles)})`);
    }
  }
  if (legacyConfig.skipSSLValidation) {
    configList.add(`process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';`);
  }
  serveConfigList.add(`plugins: ctx => ([
    ${Array.from(pluginList).join(',\n')}
  ])`);
  addImport(importMap, '@graphql-hive/gateway', 'defineConfig as defineGatewayConfig');
  const serveConfig = `
    export const gatewayConfig = defineGatewayConfig({
      ${Array.from(serveConfigList).join(',\n')}
    });
  `;
  for (const [packageName, imports] of importMap) {
    configList.add(`import { ${Array.from(imports).join(', ')} } from '${packageName}';`);
  }
  configList.add(composeConfig);
  configList.add(serveConfig);
  const newConfigPath = join(cwd, 'mesh.config.ts');
  let configContent = Array.from(configList).join('\n');
  configContent = await format(configContent, {
    parser: 'typescript',
  });
  writeFileSync(newConfigPath, configContent);
  console.log('Migration successful!');
  console.log(' ');
  console.log(`New config file created at ${newConfigPath}`);
  console.log(' ');
  console.log('Please make sure to install the following packages in package.json:');
  for (const packageName of addedPackages) {
    console.log(`- ${packageName}`);
  }
  console.log(' ');
  console.log('Please make sure to remove the following packages in package.json:');
  for (const packageName of removedPackages) {
    console.log(`- ${packageName}`);
  }
  console.log(' ');
  console.log(
    `Then run "npx mesh-compose -o supergraph.graphql" to generate the supergraph schema!`,
  );
  console.log(`Finally, run "npx hive-gateway supergraph" to start the gateway server!`);
}

function addImport(importMap: Map<string, Set<string>>, packageName: string, importName: string) {
  let set = importMap.get(packageName);
  if (!set) {
    set = new Set();
    importMap.set(packageName, set);
  }
  set.add(importName);
}

const handlerInfoMap = {
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

const transformInfoMap = {
  cache: {
    deprecated: 'Cache Transform has been deprecated, please use response caching plugin instead!',
  },
  encapsulate: {
    fnName: 'createEncapsulateTransform',
  },
  extend: {
    deprecated: 'Extend Transform has been deprecated, please use additionalTypeDefs instead!',
  },
  federation: {
    fnName: 'createFederationTransform',
  },
  filterSchema: {
    fnName: 'createFilterTransform',
  },
  hoistField: {
    fnName: 'createHoistFieldTransform',
  },
  namingConvention: {
    fnName: 'createNamingConventionTransform',
  },
  prefix: {
    fnName: 'createPrefixTransform',
  },
  rateLimit: {
    deprecated: 'RateLimit Transform has been deprecated, please use rate limiting plugin instead!',
  },
  rename: {
    fnName: 'createRenameTransform',
  },
  replaceField: {
    deprecated:
      'ReplaceField Transform has been deprecated, please check other alternatives like Hoist Field Transform!',
  },
  resolversComposition: {
    deprecated:
      'ResolversComposition Transform has been deprecated, please use alternatives or additionalResolvers instead!',
  },
  typeMerging: {
    deprecated:
      'TypeMerging Transform has been deprecated, please use Federation Transform instead!',
  },
};

function handleTransformConfiguration(
  importMap: Map<string, Set<string>>,
  transformConfiguration: YamlConfig.Transform,
) {
  const transformName = Object.keys(transformConfiguration)[0];
  const transformConfig = transformConfiguration[transformName];
  const transformInfo = transformInfoMap[transformName];
  if (transformInfo.deprecated) {
    console.error(transformInfo.deprecated);
    process.exit(1);
  }
  addImport(importMap, '@graphql-mesh/compose-cli', transformInfo.fnName);
  return `${transformInfo.fnName}(${JSON.stringify(transformConfig)})`;
}
