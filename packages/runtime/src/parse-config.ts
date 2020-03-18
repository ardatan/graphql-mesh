import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { GetMeshOptions, Transformation, MeshResolvedSource } from './types';
import { getHandler, getPackage, resolveAdditionalResolvers } from './utils';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';

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

  const sources = await Promise.all(
    config.sources.map<Promise<MeshResolvedSource>>(async source => {
      const transformations: Transformation[] = await Promise.all(
        (source.transformations || []).map(async t => {
          return {
            config: t,
            transformer: await getPackage<TransformFn>(t.type, 'transform')
          };
        })
      );

      return {
        name: source.name,
        handler: await getHandler(source.handler.name),
        handlerSourceObject: source.handler,
        context: source.context || {},
        transformations
      };
    })
  );

  const transformations: Transformation[] = await Promise.all(
    (config.transformations || []).map(async t => {
      return {
        config: t,
        transformer: await getPackage<TransformFn>(t.type, 'transform')
      };
    })
  );

  const additionalResolvers = await resolveAdditionalResolvers(
    dir,
    config.additionalResolvers || []
  );

  return {
    sources,
    transformations,
    additionalResolvers
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