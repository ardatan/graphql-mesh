import { ConfigProcessOptions, processConfig } from '@graphql-mesh/config';
import { jsonSchema, YamlConfig } from '@graphql-mesh/types';
import { defaultImportFn, loadYaml, DefaultLogger } from '@graphql-mesh/utils';
import Ajv from 'ajv';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { path, process } from '@graphql-mesh/cross-helpers';

export function validateConfig(config: any, filepath: string): asserts config is YamlConfig.Config {
  const ajv = new Ajv({
    strict: false,
  } as any);
  jsonSchema.$schema = undefined;
  const isValid = ajv.validate(jsonSchema, config);
  if (!isValid) {
    const logger = new DefaultLogger('🕸️  Mesh - Config');
    logger.warn(
      `${filepath} configuration file is not valid:\n${ajv.errorsText(ajv.errors, {
        separator: '\n',
      })}\nThis is just a warning! It doesn't have any effects on runtime.`
    );
  }
}

export async function findAndParseConfig(options?: ConfigProcessOptions) {
  const { configName = 'mesh', dir: configDir = '', ...restOptions } = options || {};
  const dir = path.isAbsolute(configDir) ? configDir : path.join(process.cwd(), configDir);
  const explorer = cosmiconfig(configName, {
    searchPlaces: [
      'package.json',
      `.${configName}rc`,
      `.${configName}rc.json`,
      `.${configName}rc.yaml`,
      `.${configName}rc.yml`,
      `.${configName}rc.js`,
      `.${configName}rc.ts`,
      `.${configName}rc.cjs`,
      `${configName}.config.js`,
      `${configName}.config.cjs`,
    ],
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
    throw new Error(`No ${configName} config file found in "${dir}"!`);
  }

  const config = results.config;
  validateConfig(config, results.filepath);
  return processConfig(config, { dir, ...restOptions });
}

function customLoader(ext: 'json' | 'yaml' | 'js', importFn = defaultImportFn) {
  function loader(filepath: string, content: string) {
    if (process.env) {
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
      return loadYaml(filepath, content);
    }

    if (ext === 'js') {
      return importFn(filepath);
    }
  }

  return loader;
}
