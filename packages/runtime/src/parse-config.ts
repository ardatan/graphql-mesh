import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { GetMeshOptions, ResolvedTransform, MeshResolvedSource } from './types';
import { getHandler, getPackage, resolveAdditionalResolvers, resolveCache } from './utils';
import { TransformFn, YamlConfig, getJsonSchema } from '@graphql-mesh/types';
import Ajv from 'ajv';

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

  const [sources, transforms, additionalResolvers, cache] = await Promise.all([
    Promise.all(
      config.sources.map<Promise<MeshResolvedSource>>(async source => {
        const transforms: ResolvedTransform[] = await Promise.all(
          (source.transforms || []).map(async t => {
            const transformName = Object.keys(t)[0] as keyof YamlConfig.Transform;
            const transformConfig = t[transformName];

            return {
              config: transformConfig,
              transformFn: await getPackage<TransformFn>(transformName, 'transform'),
            } as ResolvedTransform;
          })
        );

        const handlerName = Object.keys(source.handler)[0] as keyof YamlConfig.Handler;
        const handlerLibrary = await getHandler(handlerName);
        const handlerConfig = source.handler[handlerName];

        return {
          name: source.name,
          handlerLibrary,
          handlerConfig,
          context: source.context || {},
          transforms,
        } as MeshResolvedSource;
      })
    ),
    Promise.all(
      config.transforms?.map(async t => {
        const transformName = Object.keys(t)[0] as keyof YamlConfig.Transform;
        const transformConfig = t[transformName];

        return {
          config: transformConfig,
          transformFn: await getPackage<TransformFn>(transformName, 'transform'),
        } as ResolvedTransform;
      }) || []
    ),
    resolveAdditionalResolvers(dir, ignoreAdditionalResolvers ? [] : config.additionalResolvers || []),
    resolveCache(config.cache),
  ]);

  return {
    sources,
    transforms,
    additionalResolvers,
    cache,
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

export async function findAndParseConfig(
  options?: { configName?: string } & ConfigProcessOptions
): Promise<GetMeshOptions> {
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
