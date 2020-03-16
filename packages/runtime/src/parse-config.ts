import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { GetMeshOptions } from './types';
import { getHandler, getPackage, resolveAdditionalResolvers, resolveCache } from './utils';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';

export async function parseConfig(
  name = 'mesh',
  dir = process.cwd()
): Promise<GetMeshOptions> {
  const explorer = cosmiconfig(name, {
    loaders: {
      '.json': customLoader('json'),
      '.yaml': customLoader('yaml'),
      '.yml': customLoader('yaml'),
      '.js': customLoader('js'),
      noExt: customLoader('yaml'),
    },
  });
  const results = await explorer.search(dir);
  const config = results?.config as YamlConfig.Config;

  const [
    sources,
    transformations,
    additionalResolvers,
    cache,
  ] = await Promise.all([
    Promise.all(
      config.sources.map(async source => {
    
        const [
          handler,
          transformations
        ] = await Promise.all([
          getHandler(source.handler.name),
          Promise.all((source.transformations || []).map(async t => ({
              config: t,
              transformer: await getPackage<TransformFn>(t.type, 'transform')
            })))
          ]
        );
  
        return {
          name: source.name,
          handler,
          config: ('config' in source.handler ? source.handler.config : {}),
          source: source.source,
          context: source.context || {},
          transformations
        };
      })
    ),
    Promise.all(
      (config.transformations || []).map(async t => {
        return {
          config: t,
          transformer: await getPackage<TransformFn>(t.type, 'transform')
        };
      })
    ),
    resolveAdditionalResolvers(
      dir,
      config.additionalResolvers || []
    ),
    config.cache ? resolveCache(config.cache).then(Cache => new Cache(config.cache?.config)) : new InMemoryLRUCache(),
  ]);

  return {
    sources,
    transformations,
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