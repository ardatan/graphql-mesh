import { fetchFactory, KeyValueCache } from 'fetchache';
import { fetch as crossFetch, Request, Response } from 'cross-undici-fetch';
import isUrl from 'is-url';
import { load as loadYamlFromJsYaml } from 'js-yaml';
import { isAbsolute, resolve } from 'path';
import { promises as fsPromises } from 'fs';
import { ImportFn } from '@graphql-mesh/types';
import { defaultImportFn } from './defaultImportFn';
import { setBaseFile, YAML_INCLUDE_SCHEMA } from 'yaml-include';

const { readFile: readFileFromFS } = fsPromises || {};

export { isUrl };

export interface ReadFileOrUrlOptions extends RequestInit {
  allowUnknownExtensions?: boolean;
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  cwd?: string;
  fetch?: typeof crossFetch;
  importFn?: ImportFn;
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

export function loadYaml<T = any>(filepath: string, content: string): T {
  setBaseFile(filepath);
  return loadYamlFromJsYaml(content, { schema: YAML_INCLUDE_SCHEMA, filename: filepath }) as any;
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
    return loadYaml(actualPath, rawResult);
  } else if (fallbackFormat) {
    switch (fallbackFormat) {
      case 'json':
        return JSON.parse(rawResult);
      case 'yaml':
        return loadYaml(actualPath, rawResult);
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
    return loadYaml(path, responseText);
  } else if (!allowUnknownExtensions) {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure URL '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml) or mime type in the response headers.`
    );
  }
  return responseText as any;
}
