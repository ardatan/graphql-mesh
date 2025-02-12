import Ajv from 'ajv';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import type { ConfigProcessOptions } from '@graphql-mesh/config';
import { processConfig } from '@graphql-mesh/config';
import { path, process } from '@graphql-mesh/cross-helpers';
import { include } from '@graphql-mesh/include';
import type { YamlConfig } from '@graphql-mesh/types';
import { jsonSchema } from '@graphql-mesh/types';
import { DefaultLogger, loadYaml } from '@graphql-mesh/utils';

export function validateConfig(
  config: any,
  filepath: string,
  initialLoggerPrefix: string,
  throwOnInvalidConfig = false,
  logger = new DefaultLogger(initialLoggerPrefix).child('config'),
): asserts config is YamlConfig.Config {
  if (jsonSchema) {
    const ajv = new Ajv({
      strict: false,
    } as any);
    jsonSchema.$schema = undefined;
    const isValid = ajv.validate(jsonSchema, config);
    if (!isValid) {
      if (throwOnInvalidConfig) {
        const aggregateError = new AggregateError(
          ajv.errors.map(e => {
            const error = new Error(e.message);
            error.stack += `\n    at ${filepath}:0:0`;
            return error;
          }),
          'Configuration file is not valid',
        );
        throw aggregateError;
      }
      logger = logger.child('config');
      logger.warn('Configuration file is not valid!');
      logger.warn("This is just a warning! It doesn't have any effects on runtime.");
      ajv.errors.forEach(error => {
        let errorMessage = '';
        if (error.propertyName) {
          errorMessage += `Property: ${error.propertyName} \n`;
        }
        if (error.data) {
          errorMessage += `Given: ${error.data} \n`;
        }
        errorMessage += `Error: ${error.message}`;
        logger.warn(errorMessage);
      });
    }
  }
}

export async function findConfig(options?: {
  configName?: string;
  dir?: string;
  initialLoggerPrefix?: string;
  importFn?: (moduleId: string) => any;
}) {
  const {
    configName = 'mesh',
    dir: configDir = '',
    initialLoggerPrefix = '',
    importFn,
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

  return results;
}

export async function findAndParseConfig(options?: ConfigProcessOptions) {
  const {
    configName = 'mesh',
    dir: configDir = '',
    initialLoggerPrefix = '',
    importFn,
    logger = new DefaultLogger(initialLoggerPrefix),
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
  validateConfig(
    config,
    results.filepath,
    initialLoggerPrefix,
    restOptions.throwOnInvalidConfig,
    logger,
  );
  return processConfig(config, { dir, initialLoggerPrefix, importFn, logger, ...restOptions });
}

function customLoader(ext: 'json' | 'yaml' | 'js', importFn = include, initialLoggerPrefix = '') {
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
