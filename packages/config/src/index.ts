import { MeshResolvedSource } from '@graphql-mesh/runtime';
import {
  getJsonSchema,
  MergerFn,
  MeshHandlerLibrary,
  MeshPubSub,
  MeshTransform,
  MeshTransformLibrary,
  YamlConfig,
} from '@graphql-mesh/types';
import { IResolvers } from '@graphql-tools/utils';
import Ajv from 'ajv';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { KeyValueCache } from 'fetchache';
import { DocumentNode } from 'graphql';
import {
  getHandler,
  getPackage,
  resolveAdditionalResolvers,
  resolveAdditionalTypeDefs,
  resolveCache,
  resolveMerger,
  resolvePubSub,
} from './utils';

declare global {
  interface ObjectConstructor {
    keys<T>(obj: T): Array<keyof T>;
  }
}

export type ConfigProcessOptions = {
  dir?: string;
  ignoreAdditionalResolvers?: boolean;
  importFn?: (moduleId: string) => Promise<any>;
};

export async function parseConfig(
  rawConfig: YamlConfig.Config | string,
  options?: { configFormat?: 'yaml' | 'json' | 'object' } & ConfigProcessOptions
) {
  let config: YamlConfig.Config;
  const { configFormat = 'object' } = options || {};
  switch (configFormat) {
    case 'yaml':
      config = defaultLoaders['.yaml']('.meshrc.yml', rawConfig as string);
      break;
    case 'json':
      config = defaultLoaders['.json']('.meshrc.json', rawConfig as string);
      break;
    case 'object':
      config = rawConfig as YamlConfig.Config;
      break;
  }
  return processConfig(config, options);
}

export type ProcessedConfig = {
  sources: MeshResolvedSource<any>[];
  transforms: MeshTransform[];
  additionalTypeDefs: DocumentNode[];
  additionalResolvers: IResolvers;
  cache: KeyValueCache<string>;
  merger: MergerFn;
  mergerType: string;
  pubsub: MeshPubSub;
  config: YamlConfig.Config;
};

export async function processConfig(
  config: YamlConfig.Config,
  options?: ConfigProcessOptions
): Promise<ProcessedConfig> {
  const { dir = process.cwd(), ignoreAdditionalResolvers = false, importFn = (moduleId: string) => import(moduleId) } =
    options || {};
  await Promise.all(config.require?.map(mod => importFn(mod)) || []);

  const cache = await resolveCache(config.cache, importFn);
  const pubsub = await resolvePubSub(config.pubsub, importFn);

  const [sources, transforms, additionalTypeDefs, additionalResolvers, merger] = await Promise.all([
    Promise.all(
      config.sources.map<Promise<MeshResolvedSource>>(async source => {
        const handlerName = Object.keys(source.handler)[0];
        const handlerConfig = source.handler[handlerName];
        const [handlerLibrary, transforms] = await Promise.all([
          getHandler(handlerName, importFn),
          Promise.all(
            (source.transforms || []).map(async t => {
              const transformName = Object.keys(t)[0];
              const transformConfig = t[transformName];
              const TransformCtor = await getPackage<MeshTransformLibrary>(
                transformName.toString(),
                'transform',
                importFn
              );

              return new TransformCtor({
                apiName: source.name,
                config: transformConfig,
                cache,
                pubsub,
              });
            })
          ),
        ]);

        const HandlerCtor: MeshHandlerLibrary = handlerLibrary;

        return {
          name: source.name,
          handler: new HandlerCtor({
            name: source.name,
            cache,
            pubsub,
            config: handlerConfig,
          }),
          transforms,
        };
      })
    ),
    Promise.all(
      config.transforms?.map(async t => {
        const transformName = Object.keys(t)[0] as keyof YamlConfig.Transform;
        const transformConfig = t[transformName];
        const TransformLibrary = await getPackage<MeshTransformLibrary>(
          transformName.toString(),
          'transform',
          importFn
        );
        return new TransformLibrary({
          apiName: '',
          cache,
          pubsub,
          config: transformConfig,
        });
      }) || []
    ),
    resolveAdditionalTypeDefs(dir, config.additionalTypeDefs),
    resolveAdditionalResolvers(
      dir,
      ignoreAdditionalResolvers ? [] : config.additionalResolvers || [],
      importFn,
      pubsub
    ),
    resolveMerger(config.merger, importFn),
  ]);

  return {
    sources,
    transforms,
    additionalTypeDefs,
    additionalResolvers,
    cache,
    merger,
    mergerType: config.merger,
    pubsub,
    config,
  };
}

function customLoader(ext: 'json' | 'yaml' | 'js') {
  function loader(filepath: string, content: string) {
    if (typeof process !== 'undefined' && 'env' in process) {
      content = content.replace(/\$\{(.*?)\}/g, (_, variable) => {
        let varName = variable;
        let defaultValue = '';

        if (variable.includes(':')) {
          const spl = variable.split(':');
          varName = spl.shift();
          defaultValue = spl.join(':');
        }

        return process.env[varName] || defaultValue;
      });
    }

    if (ext === 'json') {
      return defaultLoaders['.json'](filepath, content);
    }

    if (ext === 'yaml') {
      return defaultLoaders['.yaml'](filepath, content);
    }

    if (ext === 'js') {
      return defaultLoaders['.js'](filepath, content);
    }
  }

  return loader;
}

export function validateConfig(config: any): asserts config is YamlConfig.Config {
  const ajv = new Ajv({
    strict: false,
  });
  const jsonSchema = getJsonSchema();
  jsonSchema.$schema = undefined;
  const isValid = ajv.validate(jsonSchema, config);
  if (!isValid) {
    console.warn(`GraphQL Mesh Configuration is not valid:\n${ajv.errorsText()}`);
  }
}

export async function findAndParseConfig(options?: { configName?: string } & ConfigProcessOptions) {
  const { configName = 'mesh', dir = process.cwd(), ignoreAdditionalResolvers = false } = options || {};
  const explorer = cosmiconfig(configName, {
    loaders: {
      '.json': customLoader('json'),
      '.yaml': customLoader('yaml'),
      '.yml': customLoader('yaml'),
      '.js': customLoader('js'),
      noExt: customLoader('yaml'),
    },
  });
  const results = await explorer.search(dir);

  if (!results) {
    throw new Error(`No mesh config file was found in "${dir}"!`);
  }

  const config = results.config;
  validateConfig(config);
  return processConfig(config, { dir, ignoreAdditionalResolvers });
}
