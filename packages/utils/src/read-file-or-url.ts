import { fetchFactory, KeyValueCache } from 'fetchache';
import { fetch, Request, Response } from 'cross-fetch';
import isUrl from 'is-url';
import { load as loadYaml } from 'js-yaml';
import { isAbsolute, resolve } from 'path';
import { promises as fsPromises } from 'fs';

const { readFile, stat } = fsPromises || {};

export { isUrl };

export interface ReadFileOrUrlOptions extends RequestInit {
  allowUnknownExtensions?: boolean;
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  cwd?: string;
  fetch?: typeof fetch;
}

export function getCachedFetch(cache: KeyValueCache): typeof fetch {
  return fetchFactory({
    fetch,
    Request,
    Response,
    cache,
  });
}

export async function readFileOrUrlWithCache<T>(
  filePathOrUrl: string,
  cache: KeyValueCache,
  config?: ReadFileOrUrlOptions
): Promise<T> {
  if (isUrl(filePathOrUrl)) {
    return readUrlWithCache(filePathOrUrl, cache, config);
  } else {
    return readFileWithCache(filePathOrUrl, cache, config);
  }
}

export async function readFileWithCache<T>(
  filePath: string,
  cache: KeyValueCache,
  config?: ReadFileOrUrlOptions
): Promise<T> {
  const { allowUnknownExtensions, cwd, fallbackFormat } = config || {};
  const actualPath = isAbsolute(filePath) ? filePath : resolve(cwd || process.cwd(), filePath);
  const cachedObj = await cache.get(actualPath);
  const stats = await stat(actualPath);
  if (cachedObj) {
    if (stats.mtimeMs <= cachedObj.mtimeMs) {
      return cachedObj.result;
    }
  }
  if (/js$/.test(filePath) || /ts$/.test(filePath)) {
    return import(filePath).then(m => m.default || m);
  }
  let result: any = await readFile(actualPath, 'utf-8');
  if (/json$/.test(filePath)) {
    result = JSON.parse(result);
  } else if (/yaml$/.test(filePath) || /yml$/.test(filePath)) {
    result = loadYaml(result);
  } else if (fallbackFormat) {
    switch (fallbackFormat) {
      case 'json':
        result = JSON.parse(result);
        break;
      case 'yaml':
        result = loadYaml(result);
        break;
      case 'ts':
      case 'js':
        result = await import(filePath).then(m => m.default || m);
        break;
    }
  } else if (!allowUnknownExtensions) {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure file '${filePath}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml).`
    );
  }
  cache.set(filePath, { result, mtimeMs: stats.mtimeMs });
  return result;
}

export async function readUrlWithCache<T>(
  path: string,
  cache: KeyValueCache,
  config?: ReadFileOrUrlOptions
): Promise<T> {
  const { allowUnknownExtensions, fallbackFormat } = config || {};
  const fetch = config?.fetch || getCachedFetch(cache);
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
    return loadYaml(responseText) as any as T;
  } else if (!allowUnknownExtensions) {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure URL '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml) or mime type in the response headers.`
    );
  }
  return responseText as any;
}
