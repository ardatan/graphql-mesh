import { parse } from 'graphql';
import { KeyValueCache, YamlConfig, ImportFn, MeshPubSub, Logger } from '@graphql-mesh/types';
import { resolve } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { paramCase } from 'param-case';
import { loadDocuments, loadTypedefs } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { PubSub } from 'graphql-subscriptions';
import { EventEmitter } from 'events';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { MeshStore } from '@graphql-mesh/store';
import { DefaultLogger } from '@graphql-mesh/utils';

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
      ...(rawConfig.cache || {}),
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
    const code = `const pubsub = new PubSub(rawConfig.pubsub);`;

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
    importCode: `import { DefaultLogger } from '@graphql-mesh/utils';`,
    code: `const logger = new DefaultLogger('Mesh');`,
  };
}
