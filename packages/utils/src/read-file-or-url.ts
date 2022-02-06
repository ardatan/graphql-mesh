import { fetchFactory, KeyValueCache } from 'fetchache';
import { fetch as crossFetch, Request, Response } from 'cross-undici-fetch';
import isUrl from 'is-url';
import { DEFAULT_SCHEMA, load as loadYamlFromJsYaml, Schema, Type } from 'js-yaml';
import { dirname, isAbsolute, resolve } from 'path';
import { promises as fsPromises, readdirSync, readFileSync } from 'fs';
import { ImportFn, Logger } from '@graphql-mesh/types';
import { defaultImportFn } from './defaultImportFn';
import { join } from 'path/posix';

const { readFile: readFileFromFS } = fsPromises || {};

export { isUrl };

export interface ReadFileOrUrlOptions extends RequestInit {
  allowUnknownExtensions?: boolean;
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  cwd?: string;
  fetch?: typeof crossFetch;
  importFn?: ImportFn;
  logger?: Logger;
}

export function getCachedFetch(cache: KeyValueCache): typeof crossFetch {
  return fetchFactory({
    fetch: crossFetch,
    Request,
    Response,
    cache,
  });
}

export async function readFileOrUrl<T>(filePathOrUrl: string, config?: ReadFileOrUrlOptions): Promise<T> {
  if (isUrl(filePathOrUrl)) {
    return readUrl(filePathOrUrl, config);
  } else {
    return readFile(filePathOrUrl, config);
  }
}

function getSchema(filepath: string, logger?: Logger): Schema {
  return DEFAULT_SCHEMA.extend([
    new Type('!include', {
      kind: 'scalar',
      resolve(path: string) {
        return typeof path === 'string';
      },
      construct(path: string) {
        const newCwd = dirname(filepath);
        const absoluteFilePath = isAbsolute(path) ? path : join(newCwd, path);
        const content = readFileSync(absoluteFilePath, 'utf8');
        return loadYaml(absoluteFilePath, content, logger);
      },
    }),
    new Type('!includes', {
      kind: 'scalar',
      resolve(path: string) {
        return typeof path === 'string';
      },
      construct(path: string) {
        const newCwd = dirname(filepath);
        const absoluteDirPath = isAbsolute(path) ? path : join(newCwd, path);
        const files = readdirSync(absoluteDirPath);
        return files.map(filePath => {
          const absoluteFilePath = join(absoluteDirPath, filePath);
          const fileContent = readFileSync(absoluteFilePath, 'utf8');
          return loadYaml(absoluteFilePath, fileContent, logger);
        });
      },
    }),
  ]);
}

export function loadYaml(filepath: string, content: string, logger?: Logger): any {
  return loadYamlFromJsYaml(content, {
    filename: filepath,
    schema: getSchema(filepath, logger),
    onWarning(warning) {
      logger?.warn(`${filepath}: ${warning.message}\n${warning.stack}`);
    },
  });
}

export async function readFile<T>(filePath: string, config?: ReadFileOrUrlOptions): Promise<T> {
  const { allowUnknownExtensions, cwd, fallbackFormat, importFn = defaultImportFn } = config || {};
  const actualPath = isAbsolute(filePath) ? filePath : resolve(cwd || process.cwd(), filePath);
  if (/js$/.test(actualPath) || /ts$/.test(actualPath)) {
    return importFn(actualPath);
  }
  const rawResult = await readFileFromFS(actualPath, 'utf-8');
  if (/json$/.test(actualPath)) {
    return JSON.parse(rawResult);
  }
  if (/yaml$/.test(actualPath) || /yml$/.test(actualPath)) {
    return loadYaml(actualPath, rawResult, config?.logger);
  } else if (fallbackFormat) {
    switch (fallbackFormat) {
      case 'json':
        return JSON.parse(rawResult);
      case 'yaml':
        return loadYaml(actualPath, rawResult, config?.logger);
      case 'ts':
      case 'js':
        return importFn(actualPath);
    }
  } else if (!allowUnknownExtensions) {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure file '${filePath}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml).`
    );
  }
  return rawResult as unknown as T;
}

export async function readUrl<T>(path: string, config?: ReadFileOrUrlOptions): Promise<T> {
  const { allowUnknownExtensions, fallbackFormat } = config || {};
  const fetch = config?.fetch || crossFetch;
  config.headers = config.headers || {};
  const response = await fetch(path, config);
  const contentType = response.headers?.get('content-type') || '';
  const responseText = await response.text();
  if (/json$/.test(path) || contentType.startsWith('application/json') || fallbackFormat === 'json') {
    return JSON.parse(responseText);
  } else if (
    /yaml$/.test(path) ||
    /yml$/.test(path) ||
    contentType.includes('yaml') ||
    contentType.includes('yml') ||
    fallbackFormat === 'yaml'
  ) {
    return loadYaml(path, responseText, config?.logger);
  } else if (!allowUnknownExtensions) {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure URL '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml) or mime type in the response headers.`
    );
  }
  return responseText as any;
}
