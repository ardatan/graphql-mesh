import { JsonPointer } from 'json-ptr';
import path from 'path';
import urlJoin from 'url-join';
import { fetch as crossUndiciFetch } from 'cross-undici-fetch';
import { readFileOrUrl } from '@graphql-mesh/utils';

const { dirname, isAbsolute, join } = path;

export const resolvePath = (path: string, root: any): any => {
  return JsonPointer.get(root, path);
};
function isRefObject(obj: any): obj is { $ref: string } {
  return typeof obj === 'object' && obj.$ref;
}

function isURL(str: string) {
  return /^https?:\/\//.test(str);
}

const getAbsolute$Ref = (given$ref: string, baseFilePath: string) => {
  const [givenExternalFileRelativePath, givenRefPath] = given$ref.split('#');
  if (givenExternalFileRelativePath) {
    const cwd = isURL(baseFilePath) ? getCwdForUrl(baseFilePath) : dirname(baseFilePath);
    const givenExternalFilePath = getAbsolutePath(givenExternalFileRelativePath, cwd);
    if (givenRefPath) {
      return `${givenExternalFilePath}#${givenRefPath}`;
    }
    return givenExternalFilePath;
  }
  return `${baseFilePath}#${givenRefPath}`;
};

function getCwdForUrl(url: string) {
  const urlParts = url.split('/');
  urlParts.pop();
  return urlParts.join('/');
}

function normalizeUrl(url: string) {
  return new URL(url).toString();
}

export function getAbsolutePath(path: string, cwd: string) {
  if (isURL(path)) {
    return path;
  }
  if (isURL(cwd)) {
    return normalizeUrl(urlJoin(cwd, path));
  }
  if (isAbsolute(path)) {
    return path;
  }
  return join(cwd, path);
}

export function getCwd(path: string) {
  return isURL(path) ? getCwdForUrl(path) : dirname(path);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export async function dereferenceObject<T extends object, TRoot = T>(
  obj: T,
  {
    cwd = process.cwd(),
    externalFileCache = new Map<string, any>(),
    refMap = new Map<string, any>(),
    root = obj as any,
    fetch = crossUndiciFetch,
    headers,
  }: {
    cwd?: string;
    externalFileCache?: Map<string, any>;
    refMap?: Map<string, any>;
    root?: TRoot;
    fetch?: WindowOrWorkerGlobalScope['fetch'];
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  if (typeof obj === 'object') {
    if (isRefObject(obj)) {
      const $ref = obj.$ref;
      if (refMap.has($ref)) {
        return refMap.get($ref);
      } else {
        const [externalRelativeFilePath, refPath] = $ref.split('#');
        if (externalRelativeFilePath) {
          const externalFilePath = getAbsolutePath(externalRelativeFilePath, cwd);
          const newCwd = getCwd(externalFilePath);
          let externalFile = externalFileCache.get(externalFilePath);
          if (!externalFile) {
            externalFile = await readFileOrUrl(externalFilePath, {
              fetch,
              headers,
              cwd,
            }).catch(() => {
              throw new Error(`Unable to load ${externalRelativeFilePath} from ${cwd}`);
            });
            externalFileCache.set(externalFilePath, externalFile);

            // Title should not be overwritten by the title given from the reference
            // Usually Swagger and OpenAPI Schemas have this
            if (externalFile.definitions) {
              for (const definitionName in externalFile.definitions) {
                const definition = externalFile.definitions[definitionName];
                if (!definition.title) {
                  definition.title = definitionName;
                }
              }
            }

            if (externalFile.components?.schemas) {
              for (const definitionName in externalFile.components.schemas) {
                const definition = externalFile.components.schemas[definitionName];
                if (!definition.title) {
                  definition.title = definitionName;
                }
              }
            }
          }
          const result = await dereferenceObject(
            refPath
              ? {
                  $ref: `#${refPath}`,
                }
              : externalFile,
            {
              cwd: newCwd,
              externalFileCache,
              refMap: new Proxy(refMap, {
                get: (originalRefMap, key) => {
                  switch (key) {
                    case 'has':
                      return (given$ref: string) => {
                        const original$Ref = getAbsolute$Ref(given$ref, externalFilePath);
                        return originalRefMap.has(original$Ref);
                      };
                    case 'get':
                      return (given$ref: string) => {
                        const original$Ref = getAbsolute$Ref(given$ref, externalFilePath);
                        return originalRefMap.get(original$Ref);
                      };
                    case 'set':
                      return (given$ref: string, val: any) => {
                        const original$Ref = getAbsolute$Ref(given$ref, externalFilePath);
                        return originalRefMap.set(original$Ref, val);
                      };
                  }
                  throw new Error('Not implemented ' + key.toString());
                },
              }),
              fetch,
              headers,
              root: externalFile,
            }
          );
          refMap.set($ref, result);
          if (result && !result.$resolvedRef) {
            result.$resolvedRef = refPath;
          }
          if ((obj as any).title && !result.title) {
            result.title = (obj as any).title;
          }
          return result;
        } else {
          const resolvedObj = resolvePath(refPath, root);
          if (typeof resolvedObj === 'object' && !resolvedObj.$ref) {
            refMap.set($ref, resolvedObj);
          }
          if (resolvedObj && !resolvedObj.$resolvedRef) {
            resolvedObj.$resolvedRef = refPath;
          }
          const result = await dereferenceObject(resolvedObj, {
            cwd,
            externalFileCache,
            refMap,
            root,
            fetch,
            headers,
          });
          refMap.set($ref, result);
          if (result && !result.$resolvedRef) {
            result.$resolvedRef = refPath;
          }
          return result;
        }
      }
    } else {
      for (const key in obj) {
        const val = obj[key];
        if (typeof val === 'object') {
          obj[key] = await dereferenceObject<any>(val, {
            cwd,
            externalFileCache,
            refMap,
            root,
            fetch,
            headers,
          });
        }
      }
    }
  }
  return obj;
}
