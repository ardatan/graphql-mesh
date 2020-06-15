import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { MeshResolvedSource, ResolvedTransform } from './types';
import {
  getHandler,
  getPackage,
  resolveAdditionalResolvers,
  resolveCache,
  resolveMerger,
  resolveAdditionalTypeDefs,
} from './utils';
import { YamlConfig, getJsonSchema } from '@graphql-mesh/types';
import Ajv from 'ajv';

declare global {
  interface ObjectConstructor {
    keys<T>(obj: T): Array<keyof T>;
  }
}

export type ConfigProcessOptions = {
  dir?: string;
  ignoreAdditionalResolvers?: boolean;
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
  const { dir = process.cwd(), ignoreAdditionalResolvers = false } = options || {};
  await Promise.all(config.require?.map(mod => import(mod)) || []);

  const [sources, transforms, additionalTypeDefs, additionalResolvers, cache, merger] = await Promise.all([
    Promise.all(
      config.sources.map<Promise<MeshResolvedSource>>(async source => {
        const handlerName = Object.keys(source.handler)[0];
        const handlerConfig = source.handler[handlerName];
        const [handlerLibrary, transforms] = await Promise.all([
          getHandler(handlerName),
          Promise.all(
            (source.transforms || []).map(async t => {
              const transformName: keyof YamlConfig.Transform = Object.keys(t)[0];
              const transformConfig = t[transformName];
              const transformLibrary = await getPackage<ResolvedTransform['transformLibrary']>(
                transformName,
                'transform'
              );

              return {
                config: transformConfig,
                transformLibrary,
              };
            })
          ),
        ]);

        return {
          name: source.name,
          handlerConfig,
          handlerLibrary,
          transforms,
        };
      })
    ),
    Promise.all(
      config.transforms?.map(async t => {
        const transformName = Object.keys(t)[0] as keyof YamlConfig.Transform;
        const transformConfig = t[transformName];
        const TransformLibrary = await getPackage<ResolvedTransform['transformLibrary']>(transformName, 'transform');
        return {
          config: transformConfig,
          transformLibrary: TransformLibrary,
        };
      }) || []
    ),
    resolveAdditionalTypeDefs(dir, config.additionalTypeDefs),
    resolveAdditionalResolvers(dir, ignoreAdditionalResolvers ? [] : config.additionalResolvers || []),
    resolveCache(config.cache),
    resolveMerger(config.merger),
  ]);

  return {
    sources,
    transforms,
    additionalTypeDefs,
    additionalResolvers,
    cache,
    merger,
    mergerType: config.merger,
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
  const config = results?.config;
  validateConfig(config);
  return processConfig(config, { dir, ignoreAdditionalResolvers });
}
