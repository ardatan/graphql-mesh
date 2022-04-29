import { KeyValueCache, YamlConfig, ImportFn, MeshPubSub, Logger } from '@graphql-mesh/types';
import { path } from '@graphql-mesh/cross-helpers';
import { printSchemaWithDirectives, Source } from '@graphql-tools/utils';
import { paramCase } from 'param-case';
import { loadDocuments, loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { PubSub, DefaultLogger, parseWithCache } from '@graphql-mesh/utils';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { MeshStore } from '@graphql-mesh/store';

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
  const initialPossibleNames = [casedName, `${casedName}-${casedType}`, `${casedType}-${casedName}`, casedType];
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
      const exported = await importFn(moduleName);
      const resolved = exported.default || (exported as T);
      return {
        moduleName,
        resolved,
      };
    } catch (err) {
      const error: Error = err;
      if (
        !error.message.includes(`Cannot find module '${moduleName}'`) &&
        !error.message.includes(`Cannot find package '${moduleName}'`) &&
        !error.message.includes(`Could not locate module`)
      ) {
        throw new Error(`Unable to load ${type} matching ${name}: ${error.message}`);
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
      source => source.document || parseWithCache(source.rawSDL || printSchemaWithDirectives(source.schema))
    );
  }
  return undefined;
}

export async function resolveCache(
  cacheConfig: YamlConfig.Config['cache'] = {
    localforage: {
      driver: ['WEBSQL', 'INDEXEDDB', 'LOCALSTORAGE'],
    },
  },
  importFn: ImportFn,
  rootStore: MeshStore,
  cwd: string,
  pubsub: MeshPubSub,
  additionalPackagePrefixes: string[]
): Promise<{
  cache: KeyValueCache;
  importCode: string;
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
  });

  const code = `const cache = new (MeshCache as any)({
      ...(rawConfig.cache || {}),
      importFn,
      store: rootStore.child('cache'),
      pubsub,
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
  cwd: string,
  additionalPackagePrefixes: string[]
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

    const { moduleName, resolved: PubSub } = await getPackage<any>({
      name: pubsubName,
      type: 'pubsub',
      importFn,
      cwd,
      additionalPrefixes: additionalPackagePrefixes,
    });

    const pubsub = new PubSub(pubsubConfig);

    const importCode = `import PubSub from '${moduleName}'`;
    const code = `const pubsub = new PubSub(rawConfig.pubsub);`;

    return {
      importCode,
      code,
      pubsub,
    };
  } else {
    const pubsub = new PubSub();

    const importCode = `import { PubSub } from '@graphql-mesh/utils';`;
    const code = `const pubsub = new PubSub();`;

    return {
      importCode,
      code,
      pubsub,
    };
  }
}

export async function resolveDocuments(
  documentsConfig: YamlConfig.Config['documents'],
  cwd: string
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
  additionalPackagePrefixes: string[]
): Promise<{
  importCode: string;
  code: string;
  logger: Logger;
}> {
  if (typeof loggerConfig === 'string') {
    const { moduleName, resolved: logger } = await getPackage<Logger>({
      name: loggerConfig,
      type: 'logger',
      importFn,
      cwd,
      additionalPrefixes: additionalPackagePrefixes,
    });
    return {
      logger,
      importCode: `import logger from '${moduleName}';`,
      code: '',
    };
  }
  const logger = new DefaultLogger('🕸️  Mesh');
  return {
    logger,
    importCode: `import { DefaultLogger } from '@graphql-mesh/utils';`,
    code: `const logger = new DefaultLogger('🕸️  Mesh');`,
  };
}
