import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { GetMeshOptions, ResolvedTransform, MeshResolvedSource } from './types';
import {
  getHandler,
  getPackage,
  resolveAdditionalResolvers,
  resolveCache
} from './utils';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';

export async function parseConfig(
  name = 'mesh',
  dir = process.cwd(),
  ignoreAdditionalResolvers = false
): Promise<GetMeshOptions> {
  const explorer = cosmiconfig(name, {
    loaders: {
      '.json': customLoader('json'),
      '.yaml': customLoader('yaml'),
      '.yml': customLoader('yaml'),
      '.js': customLoader('js'),
      noExt: customLoader('yaml')
    }
  });
  const results = await explorer.search(dir);
  const config = results?.config as YamlConfig.Config;

  await Promise.all(config.require?.map(mod => import(mod)) || []);

  const [sources, transforms, additionalResolvers, cache] = await Promise.all([
    Promise.all(
      config.sources.map<Promise<MeshResolvedSource>>(async source => {
        const transforms: ResolvedTransform[] = await Promise.all(
          (source.transforms || []).map(async t => {
            const transformName = Object.keys(
              t
            )[0] as keyof YamlConfig.Transform;
            const transformConfig = t[transformName];

            return <ResolvedTransform>{
              config: transformConfig,
              transformFn: await getPackage<TransformFn>(
                transformName,
                'transform'
              )
            };
          })
        );

        const handlerName = Object.keys(
          source.handler
        )[0] as keyof YamlConfig.Handler;
        const handlerLibrary = await getHandler(handlerName);
        const handlerConfig = source.handler[handlerName];

        return <MeshResolvedSource>{
          name: source.name,
          handlerLibrary,
          handlerConfig,
          context: source.context || {},
          transforms
        };
      })
    ),
    Promise.all(
      config.transforms?.map(async t => {
        const transformName = Object.keys(t)[0] as keyof YamlConfig.Transform;
        const transformConfig = t[transformName];

        return <ResolvedTransform>{
          config: transformConfig,
          transformFn: await getPackage<TransformFn>(transformName, 'transform')
        };
      }) || []
    ),
    resolveAdditionalResolvers(
      dir,
      ignoreAdditionalResolvers ? [] : config.additionalResolvers || []
    ),
    resolveCache(config.cache)
  ]);

  return {
    sources,
    transforms,
    additionalResolvers,
    cache
  };
}

function customLoader(ext: 'json' | 'yaml' | 'js') {
  function loader(filepath: string, content: string) {
    if (typeof process !== 'undefined' && 'env' in process) {
      content = content.replace(/\$\{(.*?)\}/g, (str, variable) => {
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
