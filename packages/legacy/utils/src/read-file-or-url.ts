import type { Schema } from 'js-yaml';
import { DEFAULT_SCHEMA, load as loadYamlFromJsYaml, Type } from 'js-yaml';
import { type Logger } from '@graphql-hive/logger';
import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';
import type { ImportFn, MeshFetch, MeshFetchRequestInit } from '@graphql-mesh/types';
import { isUrl } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { loadFromModuleExportExpression } from './load-from-module-export-expression.js';

export interface ReadFileOrUrlOptions extends MeshFetchRequestInit {
  allowUnknownExtensions?: boolean;
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  cwd: string;
  fetch: MeshFetch;
  importFn: ImportFn;
  /** Preferred Hive logger key. */
  log?: Logger;
  /**
   * Legacy alias used by some `@graphql-hive/gateway-runtime` builds that still
   * pass `logger` instead of `log`. Prefer `log`.
   */
  logger?: Logger;
}

export { isUrl };

function resolveLog(config: ReadFileOrUrlOptions): Logger | undefined {
  return config.log ?? config.logger;
}

export async function readFileOrUrl<T>(
  filePathOrUrl: string,
  config: ReadFileOrUrlOptions,
): Promise<T> {
  const log = resolveLog(config);
  if (isUrl(filePathOrUrl)) {
    log?.debug(`Fetching ${filePathOrUrl} via HTTP`);
    return readUrl(filePathOrUrl, config);
  } else if (filePathOrUrl.startsWith('{') || filePathOrUrl.startsWith('[')) {
    return JSON.parse(filePathOrUrl);
  } else {
    log?.debug(`Reading ${filePathOrUrl} from the file system`);
    return readFile(filePathOrUrl, config);
  }
}

function getSchema(filepath: string, log?: Logger): Schema {
  return DEFAULT_SCHEMA.extend([
    new Type('!include', {
      kind: 'scalar',
      resolve(path: string) {
        return typeof path === 'string';
      },
      construct(path: string) {
        const newCwd = pathModule.dirname(filepath);
        const absoluteFilePath = pathModule.isAbsolute(path)
          ? path
          : pathModule.resolve(newCwd, path);
        const content = fs.readFileSync(absoluteFilePath, 'utf8');
        return loadYaml(absoluteFilePath, content, log);
      },
    }),
    new Type('!includes', {
      kind: 'scalar',
      resolve(path: string) {
        return typeof path === 'string';
      },
      construct(path: string) {
        const newCwd = pathModule.dirname(filepath);
        const absoluteDirPath = pathModule.isAbsolute(path)
          ? path
          : pathModule.resolve(newCwd, path);
        const files = fs.readdirSync(absoluteDirPath);
        return files.map(filePath => {
          const absoluteFilePath = pathModule.resolve(absoluteDirPath, filePath);
          const fileContent = fs.readFileSync(absoluteFilePath, 'utf8');
          return loadYaml(absoluteFilePath, fileContent, log);
        });
      },
    }),
  ]);
}

export function loadYaml(filepath: string, content: string, log?: Logger): any {
  return loadYamlFromJsYaml(content, {
    filename: filepath,
    schema: getSchema(filepath, log),
    onWarning(warning) {
      log?.warn(`${filepath}: ${warning.message}\n${warning.stack}`);
    },
  });
}

export async function readFile<T>(
  fileExpression: string,
  config: ReadFileOrUrlOptions,
): Promise<T> {
  const { allowUnknownExtensions, cwd, fallbackFormat, importFn } = config;
  const log = resolveLog(config);
  const [filePath] = fileExpression.split('#');
  if (/js$/.test(filePath) || /ts$/.test(filePath)) {
    return loadFromModuleExportExpression<T>(fileExpression, {
      cwd,
      importFn,
      defaultExportName: 'default',
    });
  }
  const actualPath = pathModule.isAbsolute(filePath) ? filePath : pathModule.join(cwd, filePath);
  const rawResult = await fs.promises.readFile(actualPath, 'utf-8');
  if (/json$/.test(actualPath)) {
    return JSON.parse(rawResult);
  }
  if (/yaml$/.test(actualPath) || /yml$/.test(actualPath)) {
    return loadYaml(actualPath, rawResult, log);
  } else if (fallbackFormat) {
    switch (fallbackFormat) {
      case 'json':
        return JSON.parse(rawResult);
      case 'yaml':
        return loadYaml(actualPath, rawResult, log);
      case 'ts':
      case 'js':
        return importFn(actualPath);
    }
  } else if (!allowUnknownExtensions) {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure file '${filePath}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml).`,
    );
  }
  return rawResult as unknown as T;
}

export async function readUrl<T>(path: string, config: ReadFileOrUrlOptions): Promise<T> {
  const { allowUnknownExtensions, fallbackFormat } = config || {};
  const log = resolveLog(config);
  config.headers ||= {};
  config.fetch ||= fetch;
  const response = await config.fetch(path, config);
  const contentType = response.headers?.get('content-type') || '';
  const responseText = await response.text();
  log?.debug(`${path} returned `, responseText);
  if (
    /json$/.test(path) ||
    contentType.startsWith('application/json') ||
    fallbackFormat === 'json'
  ) {
    return JSON.parse(responseText);
  } else if (
    /yaml$/.test(path) ||
    /yml$/.test(path) ||
    contentType.includes('yaml') ||
    contentType.includes('yml') ||
    fallbackFormat === 'yaml'
  ) {
    return loadYaml(path, responseText, log);
  } else if (!allowUnknownExtensions) {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure URL '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml) or mime type in the response headers.`,
    );
  }
  return responseText as any;
}
