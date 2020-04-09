import { fetchache, KeyValueCache, Request } from 'fetchache';
import isUrl from 'is-url';
import { safeLoad as loadYaml } from 'js-yaml';
import { promises as fs } from 'fs';
import { resolve } from 'path';

interface ReadFileOrUrlOptions extends RequestInit {
  allowUnknownExtensions?: boolean;
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
  const actualPath = filePath.startsWith('/') ? filePath : resolve(process.cwd(), filePath);
  const cachedObjStr = await cache.get(actualPath);
  const stats = await fs.stat(actualPath);
  if (cachedObjStr) {
    const cachedObj = JSON.parse(cachedObjStr);
    if (stats.mtimeMs <= cachedObj.mtimeMs) {
      return cachedObj.result;
    }
  }
  let result: any = await fs.readFile(actualPath, 'utf-8');
  if (/json$/.test(filePath)) {
    result = JSON.parse(result);
  } else if (/yaml$/.test(filePath) || /yml$/.test(filePath)) {
    result = loadYaml(result);
  } else if (!config?.allowUnknownExtensions) {
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
  const response = await fetchache(new Request(path, config), cache);
  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();
  if (/json$/.test(path) || contentType.startsWith('application/json')) {
    return JSON.parse(responseText);
  } else if (/yaml$/.test(path) || /yml$/.test(path) || contentType.includes('yaml') || contentType.includes('yml')) {
    return loadYaml(responseText);
  } else if (!config?.allowUnknownExtensions) {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure URL '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml) or mime type in the response headers.`
    );
  }
  return responseText as any;
}
