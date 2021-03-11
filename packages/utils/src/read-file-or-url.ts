import { fetchache, KeyValueCache, Request } from 'fetchache';
import isUrl from 'is-url';
import { load as loadYaml } from 'js-yaml';
import { isAbsolute, resolve } from 'path';
import { promises as fsPromises } from 'fs';

const { readFile, stat } = fsPromises || {};

export { isUrl };

interface ReadFileOrUrlOptions extends RequestInit {
  allowUnknownExtensions?: boolean;
  fallbackFormat?: 'json' | 'yaml';
  cwd?: string;
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
  const cachedObjStr = await cache.get(actualPath);
  const stats = await stat(actualPath);
  if (cachedObjStr) {
    const cachedObj = JSON.parse(cachedObjStr);
    if (stats.mtimeMs <= cachedObj.mtimeMs) {
      return cachedObj.result;
    }
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
    }
  } else if (!allowUnknownExtensions) {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure file '${filePath}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml).`
    );
  }
  cache.set(filePath, JSON.stringify({ result, mtimeMs: stats.mtimeMs }));
  return result;
}

export async function readUrlWithCache<T>(
  path: string,
  cache: KeyValueCache,
  config?: ReadFileOrUrlOptions
): Promise<T> {
  const { allowUnknownExtensions, fallbackFormat } = config || {};
  const response = await fetchache(new Request(path, config), cache);
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
    return (loadYaml(responseText) as any) as T;
  } else if (!allowUnknownExtensions) {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure URL '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml) or mime type in the response headers.`
    );
  }
  return responseText as any;
}
