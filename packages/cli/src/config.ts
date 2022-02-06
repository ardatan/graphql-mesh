import { ConfigProcessOptions, processConfig } from '@graphql-mesh/config';
import { ImportFn, jsonSchema, YamlConfig } from '@graphql-mesh/types';
import { loadYaml } from '@graphql-mesh/utils';
import Ajv from 'ajv';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { isAbsolute, join } from 'path';
import { cwd, env } from 'process';

export function validateConfig(config: any): asserts config is YamlConfig.Config {
  const ajv = new Ajv({
    strict: false,
  } as any);
  jsonSchema.$schema = undefined;
  const isValid = ajv.validate(jsonSchema, config);
  if (!isValid) {
    console.warn(`GraphQL Mesh Configuration is not valid:\n${ajv.errorsText()}`);
  }
}

export async function findAndParseConfig(options?: { configName?: string } & ConfigProcessOptions) {
  const { configName = 'mesh', dir: configDir = '', ...restOptions } = options || {};
  const dir = isAbsolute(configDir) ? configDir : join(cwd(), configDir);
  const explorer = cosmiconfig(configName, {
    loaders: {
      '.json': customLoader('json', options?.importFn),
      '.yaml': customLoader('yaml', options?.importFn),
      '.yml': customLoader('yaml', options?.importFn),
      '.js': customLoader('js', options?.importFn),
      '.ts': customLoader('js', options?.importFn),
      noExt: customLoader('yaml', options?.importFn),
    },
  });
  const results = await explorer.search(dir);

  if (!results) {
    throw new Error(`No mesh config file was found in "${dir}"!`);
  }

  const config = results.config;
  validateConfig(config);
  return processConfig(config, { dir, ...restOptions });
}

function customLoader(ext: 'json' | 'yaml' | 'js', importFn: ImportFn) {
  function loader(filepath: string, content: string) {
    if (env) {
      content = content.replace(/\$\{(.*?)\}/g, (_, variable) => {
        let varName = variable;
        let defaultValue = '';

        if (variable.includes(':')) {
          const spl = variable.split(':');
          varName = spl.shift();
          defaultValue = spl.join(':');
        }

        return env[varName] || defaultValue;
      });
    }

    if (ext === 'json') {
      return defaultLoaders['.json'](filepath, content);
    }

    if (ext === 'yaml') {
      return loadYaml(filepath, content);
    }

    if (ext === 'js') {
      return importFn(filepath);
    }
  }

  return loader;
}
