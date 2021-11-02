import { fetchFactory, KeyValueCache } from 'fetchache';
import { fetch as crossFetch, Request, Response } from 'cross-undici-fetch';
import isUrl from 'is-url';
import { load as loadYaml } from 'js-yaml';
import { isAbsolute, resolve } from 'path';
import { promises as fsPromises } from 'fs';

const { readFile: readFileFromFS } = fsPromises || {};

export { isUrl };

export interface ReadFileOrUrlOptions extends RequestInit {
  allowUnknownExtensions?: boolean;
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  cwd?: string;
  fetch?: typeof crossFetch;
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

export async function readFile<T>(filePath: string, config?: ReadFileOrUrlOptions): Promise<T> {
  const { allowUnknownExtensions, cwd, fallbackFormat } = config || {};
  const actualPath = isAbsolute(filePath) ? filePath : resolve(cwd || process.cwd(), filePath);
  if (/js$/.test(filePath) || /ts$/.test(filePath)) {
    return import(filePath).then(m => m.default || m);
  }
  const rawResult = await readFileFromFS(actualPath, 'utf-8');
  if (/json$/.test(filePath)) {
    return JSON.parse(rawResult);
  } else if (/yaml$/.test(filePath) || /yml$/.test(filePath)) {
    return loadYaml(rawResult) as T;
  } else if (fallbackFormat) {
    switch (fallbackFormat) {
      case 'json':
        return JSON.parse(rawResult);
      case 'yaml':
        return loadYaml(rawResult) as T;
      case 'ts':
      case 'js':
        return import(filePath).then(m => m.default || m);
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
    return loadYaml(responseText) as any as T;
  } else if (!allowUnknownExtensions) {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure URL '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml) or mime type in the response headers.`
    );
  }
  return responseText as any;
}
