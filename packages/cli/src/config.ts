import { ConfigProcessOptions, processConfig } from '@graphql-mesh/config';
import { jsonSchema, YamlConfig } from '@graphql-mesh/types';
import { defaultImportFn, loadYaml, DefaultLogger } from '@graphql-mesh/utils';
import Ajv from 'ajv';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { path, process } from '@graphql-mesh/cross-helpers';

export function validateConfig(
  config: any,
  filepath: string,
  initialLoggerPrefix: string
): asserts config is YamlConfig.Config {
  const ajv = new Ajv({
    strict: false,
  } as any);
  jsonSchema.$schema = undefined;
  const isValid = ajv.validate(jsonSchema, config);
  if (!isValid) {
    const logger = new DefaultLogger(initialLoggerPrefix).child('config');
    logger.warn('Configuration file is not valid!');
    logger.warn("This is just a warning! It doesn't have any effects on runtime.");
    ajv.errors.forEach(error => {
      logger.warn(error.message);
    });
  }
}

export async function findAndParseConfig(options?: ConfigProcessOptions) {
  const {
    configName = 'mesh',
    dir: configDir = '',
    initialLoggerPrefix = '🕸️  Mesh',
    importFn,
    ...restOptions
  } = options || {};
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
      '.json': customLoader('json', importFn, initialLoggerPrefix),
      '.yaml': customLoader('yaml', importFn, initialLoggerPrefix),
      '.yml': customLoader('yaml', importFn, initialLoggerPrefix),
      '.js': customLoader('js', importFn, initialLoggerPrefix),
      '.ts': customLoader('js', importFn, initialLoggerPrefix),
      noExt: customLoader('yaml', importFn, initialLoggerPrefix),
    },
  });
  const results = await explorer.search(dir);

  if (!results) {
    throw new Error(`No ${configName} config file found in "${dir}"!`);
  }

  const config = results.config;
  validateConfig(config, results.filepath, initialLoggerPrefix);
  return processConfig(config, { dir, initialLoggerPrefix, importFn, ...restOptions });
}

function customLoader(ext: 'json' | 'yaml' | 'js', importFn = defaultImportFn, initialLoggerPrefix = '🕸️  Mesh') {
  const logger = new DefaultLogger(initialLoggerPrefix).child('config');
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
      return loadYaml(filepath, content, logger);
    }

    if (ext === 'js') {
      return importFn(filepath);
    }
  }

  return loader;
}
