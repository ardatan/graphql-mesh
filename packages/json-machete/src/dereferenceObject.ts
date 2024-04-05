import JsonPointer from 'json-pointer';
import urlJoin from 'url-join';
import { handleUntitledDefinitions } from './healUntitledDefinitions.js';

export const resolvePath = (path: string, root: any): any => {
  try {
    return JsonPointer.get(root, path);
  } catch (e) {
    if (e.message?.startsWith('Invalid reference')) {
      return undefined;
    }
    throw e;
  }
};

function isUrl(str: string): boolean {
  return /^https?:\/\//.test(str);
}

function isRefObject(obj: any): obj is { $ref: string } {
  return typeof obj === 'object' && typeof obj.$ref === 'string';
}

const getAbsolute$Ref = (given$ref: string, baseFilePath: string) => {
  const [givenExternalFileRelativePath, givenRefPath] = given$ref.split('#');
  if (givenExternalFileRelativePath) {
    const cwd = getCwd(baseFilePath);
    const givenExternalFilePath = getAbsolutePath(givenExternalFileRelativePath, cwd);
    if (givenRefPath) {
      return `${givenExternalFilePath}#${givenRefPath}`;
    }
    return givenExternalFilePath;
  }
  return `${baseFilePath}#${givenRefPath}`;
};

function normalizeUrl(url: string) {
  return new URL(url).toString();
}

export function getAbsolutePath(path: string, cwd: string) {
  if (isUrl(path)) {
    return path;
  }
  if (isUrl(cwd)) {
    return normalizeUrl(urlJoin(cwd, path));
  }
  if (path.startsWith('/') || path.substring(1).startsWith(':\\')) {
    return path;
  }
  return cwd + '/' + path;
}

export function getCwd(path: string) {
  const pathParts = path.split('/');
  pathParts.pop();
  return pathParts.join('/');
}

export async function dereferenceObject<T extends object, TRoot = T>(
  obj: T,
  {
    cwd = globalThis?.process.cwd(),
    externalFileCache = new Map<string, any>(),
    refMap = new Map<string, any>(),
    root = obj as any,
    debugLogFn,
    readFileOrUrl,
    resolvedObjects = new WeakSet(),
  }: {
    cwd?: string;
    externalFileCache?: Map<string, any>;
    refMap?: Map<string, any>;
    root?: TRoot;
    debugLogFn?(message?: any): void;
    readFileOrUrl(path: string, opts: { cwd: string }): Promise<any> | any;
    resolvedObjects?: WeakSet<any>;
  },
): Promise<T> {
  if (obj != null && typeof obj === 'object') {
    if (isRefObject(obj)) {
      const $ref = obj.$ref;
      if (refMap.has($ref)) {
        return refMap.get($ref);
      } else {
        debugLogFn?.(`Resolving ${$ref}`);
        const [externalRelativeFilePath, refPath] = $ref.split('#');
        if (externalRelativeFilePath) {
          const externalFilePath = getAbsolutePath(externalRelativeFilePath, cwd);
          const newCwd = getCwd(externalFilePath);
          let externalFile = externalFileCache.get(externalFilePath);
          if (!externalFile) {
            try {
              externalFile = await readFileOrUrl(externalFilePath, { cwd });
            } catch (e) {
              console.error(e);
              throw new Error(`Unable to load ${externalRelativeFilePath} from ${cwd}`);
            }
            externalFileCache.set(externalFilePath, externalFile);

            // Title should not be overwritten by the title given from the reference
            // Usually Swagger and OpenAPI Schemas have this
            handleUntitledDefinitions(externalFile);
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
              debugLogFn,
              readFileOrUrl,
              root: externalFile,
              resolvedObjects,
            },
          );
          refMap.set($ref, result);
          resolvedObjects.add(result);
          if (result && !result.$resolvedRef) {
            result.$resolvedRef = refPath;
          }
          if ((obj as any).title && !result.title) {
            result.title = (obj as any).title;
          }
          return result;
        } else {
          const resolvedObj = resolvePath(refPath, root);
          if (resolvedObjects.has(resolvedObj)) {
            refMap.set($ref, resolvedObj);
            return resolvedObj;
          }
          /*
          if (resolvedObj && !resolvedObj.$resolvedRef) {
            resolvedObj.$resolvedRef = refPath;
          }
          */
          const result = await dereferenceObject(resolvedObj, {
            cwd,
            externalFileCache,
            refMap,
            root,
            debugLogFn,
            readFileOrUrl,
            resolvedObjects,
          });
          if (!result) {
            return obj;
          }
          resolvedObjects.add(result);
          refMap.set($ref, result);
          if (!result.$resolvedRef) {
            result.$resolvedRef = refPath;
          }
          return result;
        }
      }
    } else {
      if (!resolvedObjects.has(obj)) {
        resolvedObjects.add(obj);
        for (const key in obj) {
          const val = obj[key];
          if (typeof val === 'object') {
            obj[key] = await dereferenceObject<any>(val, {
              cwd,
              externalFileCache,
              refMap,
              root,
              debugLogFn,
              readFileOrUrl,
              resolvedObjects,
            });
          }
        }
      }
    }
  }
  return obj;
}
