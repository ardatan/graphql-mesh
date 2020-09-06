import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { MeshResolvedSource } from '@graphql-mesh/runtime';
import {
  getHandler,
  getPackage,
  resolveAdditionalResolvers,
  resolveCache,
  resolveMerger,
  resolveAdditionalTypeDefs,
} from './utils';
import { YamlConfig, getJsonSchema, Hooks, MeshTransformLibrary, MeshHandlerLibrary } from '@graphql-mesh/types';
import Ajv from 'ajv';
import { EventEmitter } from 'events';

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

export async function processConfig(config: YamlConfig.Config, options?: ConfigProcessOptions) {
  const { dir = process.cwd(), ignoreAdditionalResolvers = false, importFn = (moduleId: string) => import(moduleId) } =
    options || {};
  await Promise.all(config.require?.map(mod => importFn(mod)) || []);

  const cache = await resolveCache(config.cache, importFn);

  // TODO: Make hooks configurable
  const hooks = new EventEmitter({ captureRejections: true }) as Hooks;
  hooks.setMaxListeners(Infinity);

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
                hooks,
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
            hooks,
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
          hooks,
          config: transformConfig,
        });
      }) || []
    ),
    resolveAdditionalTypeDefs(dir, config.additionalTypeDefs),
    resolveAdditionalResolvers(dir, ignoreAdditionalResolvers ? [] : config.additionalResolvers || [], importFn),
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
    hooks,
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
  const ajv = new Ajv({ schemaId: 'auto' });
  // Settings for draft-04
  const metaSchema = require('ajv/lib/refs/json-schema-draft-04.json');
  ajv.addMetaSchema(metaSchema);
  const isValid = ajv.validate(getJsonSchema(), config);
  if (!isValid) {
    throw new Error(`GraphQL Mesh Configuration is not valid: ${ajv.errorsText()}`);
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
  const config = results.config;
  validateConfig(config);
  return processConfig(config, { dir, ignoreAdditionalResolvers });
}
