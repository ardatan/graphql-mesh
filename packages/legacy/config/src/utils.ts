import { paramCase } from 'param-case';
import { path } from '@graphql-mesh/cross-helpers';
import type { MeshStore } from '@graphql-mesh/store';
import type {
  ImportFn,
  KeyValueCache,
  Logger,
  MeshFetch,
  MeshPubSub,
  YamlConfig,
} from '@graphql-mesh/types';
import { DefaultLogger, parseWithCache, PubSub } from '@graphql-mesh/utils';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadDocuments, loadTypedefs } from '@graphql-tools/load';
import type { Source as GraphQLToolsSource } from '@graphql-tools/utils';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { crypto, fetch as defaultFetch, TextEncoder } from '@whatwg-node/fetch';

type ResolvedPackage<T> = {
  moduleName: string;
  resolved: T;
};

interface GetPackageOptions {
  name: string;
  type: string;
  importFn: ImportFn;
  cwd: string;
  additionalPrefixes?: string[];
}

export async function getPackage<T>({
  name,
  type,
  importFn,
  cwd,
  additionalPrefixes = [],
}: GetPackageOptions): Promise<ResolvedPackage<T>> {
  const casedName = paramCase(name);
  const casedType = paramCase(type);
  const prefixes = ['@graphql-mesh/', ...additionalPrefixes];
  const initialPossibleNames = [
    casedName,
    `${casedName}-${casedType}`,
    `${casedType}-${casedName}`,
    casedType,
  ];
  const possibleNames: string[] = [];
  for (const prefix of prefixes) {
    for (const possibleName of initialPossibleNames) {
      possibleNames.push(`${prefix}${possibleName}`);
    }
  }
  for (const possibleName of initialPossibleNames) {
    possibleNames.push(possibleName);
  }
  if (name.includes('-')) {
    possibleNames.push(name);
  }
  const possibleModules = possibleNames.concat(path.resolve(cwd, name));

  for (const moduleName of possibleModules) {
    try {
      const exported = await importFn(moduleName, true);
      const resolved = exported.default || (exported as T);
      const relativeModuleName = path.isAbsolute(moduleName) ? name : moduleName;
      return {
        moduleName: relativeModuleName,
        resolved,
      };
    } catch (err) {
      const error: Error = err;
      if (
        !error.message.includes(`Cannot find module '${moduleName}'`) &&
        !error.message.includes(`Cannot find package '${moduleName}'`) &&
        !error.message.includes(`Could not locate module`)
      ) {
        throw new Error(
          `Unable to load ${type} matching ${name} while resolving ${moduleName}: ${error.stack}`,
        );
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
    return sources.map(
      source =>
        source.document ||
        parseWithCache(source.rawSDL || printSchemaWithDirectives(source.schema)),
    );
  }
  return undefined;
}

export async function resolveCustomFetch({
  fetchConfig,
  importFn,
  cwd,
  cache,
  additionalPackagePrefixes,
}: {
  fetchConfig?: string;
  importFn: ImportFn;
  cwd: string;
  additionalPackagePrefixes: string[];
  cache: KeyValueCache;
}): Promise<{
  fetchFn: MeshFetch;
  code: string;
}> {
  if (!fetchConfig) {
    return {
      fetchFn: defaultFetch,
      code: `const fetchFn = await import('@whatwg-node/fetch').then(m => m?.fetch || m);`,
    };
  }
  const { moduleName, resolved: fetchFn } = await getPackage<MeshFetch>({
    name: fetchConfig,
    type: 'fetch',
    importFn,
    cwd,
    additionalPrefixes: additionalPackagePrefixes,
  });

  const processedModuleName = moduleName.startsWith('.') ? path.join('..', moduleName) : moduleName;
  const code = `const fetchFn = await import(${JSON.stringify(processedModuleName)}).then(m => m?.fetch || m);`;

  return {
    fetchFn,
    code,
  };
}

export async function resolveCache(
  cacheConfig: YamlConfig.Config['cache'] = {
    localforage: {},
  },
  importFn: ImportFn,
  rootStore: MeshStore,
  cwd: string,
  pubsub: MeshPubSub,
  logger: Logger,
  additionalPackagePrefixes: string[],
): Promise<{
  cache: KeyValueCache;
  code: string;
}> {
  const cacheName = Object.keys(cacheConfig)[0].toString();
  const config = cacheConfig[cacheName];

  const { moduleName, resolved: Cache } = await getPackage<any>({
    name: cacheName,
    type: 'cache',
    importFn,
    cwd,
    additionalPrefixes: additionalPackagePrefixes,
  });

  const cache = new Cache({
    ...config,
    importFn,
    store: rootStore.child('cache'),
    pubsub,
    logger,
  });

  const code = `const MeshCache = await import(${JSON.stringify(moduleName)}).then(handleImport);
  const cache = new MeshCache({
      ...${JSON.stringify(config)},
      importFn,
      store: rootStore.child('cache'),
      pubsub,
      logger,
    })`;

  return {
    cache,
    code,
  };
}

export async function resolvePubSub(
  pubsubYamlConfig: YamlConfig.Config['pubsub'],
  importFn: ImportFn,
  cwd: string,
  additionalPackagePrefixes: string[],
): Promise<{
  code: string;
  importCode: string;
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

    const { moduleName, resolved: PubSub } = await getPackage<any>({
      name: pubsubName,
      type: 'pubsub',
      importFn,
      cwd,
      additionalPrefixes: additionalPackagePrefixes,
    });

    const pubsub = new PubSub(pubsubConfig);

    const code = `const PubSub = await import(${JSON.stringify(moduleName)}).then(handleImport);
    const pubsub = new PubSub(${JSON.stringify(pubsubConfig)});`;

    return {
      code,
      importCode: '',
      pubsub,
    };
  } else {
    const pubsub = new PubSub();

    const code = `const pubsub = new PubSub();`;

    return {
      code,
      importCode: `import { PubSub } from '@graphql-mesh/utils';`,
      pubsub,
    };
  }
}

export async function resolveDocuments(
  documentsConfig: YamlConfig.Config['documents'],
  cwd: string,
): Promise<Source[]> {
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
  cwd: string,
  additionalPackagePrefixes: string[],
  initialLoggerPrefix = '',
): Promise<{
  importCode: string;
  code: string;
  logger: Logger;
}> {
  if (loggerConfig) {
    const { moduleName, resolved: logger } = await getPackage<Logger>({
      name: loggerConfig,
      type: 'logger',
      importFn,
      cwd,
      additionalPrefixes: additionalPackagePrefixes,
    });

    const processedModuleName = moduleName.startsWith('.')
      ? path.join('..', moduleName)
      : moduleName;

    return {
      logger,
      importCode: ``,
      code: `const logger = await import(${JSON.stringify(processedModuleName)}).then(handleImport);`,
    };
  }
  const logger = new DefaultLogger(initialLoggerPrefix);
  return {
    logger,
    importCode: `import { DefaultLogger } from '@graphql-mesh/utils';`,
    code: `const logger = new DefaultLogger(${JSON.stringify(initialLoggerPrefix)});`,
  };
}

export async function hashSHA256(str: string) {
  const textEncoder = new TextEncoder();
  const utf8 = textEncoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  let hashHex = '';
  for (const bytes of new Uint8Array(hashBuffer)) {
    hashHex += bytes.toString(16).padStart(2, '0');
  }
  return hashHex;
}

export interface Source extends GraphQLToolsSource {
  sha256Hash?: string;
}
