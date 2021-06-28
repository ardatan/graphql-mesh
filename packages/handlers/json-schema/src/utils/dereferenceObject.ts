import { KeyValueCache } from '@graphql-mesh/types';
import { JsonPointer } from 'json-ptr';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { ReadFileOrUrlOptions, readFileOrUrlWithCache } from '@graphql-mesh/utils';
import { dirname, isAbsolute, join } from 'path';
import { healJSONSchema } from './healJSONSchema';

export const resolvePath = (path: string, root: any): any => {
  return JsonPointer.get(root, path);
};
function isRefObject(obj: any): obj is { $ref: string } {
  return typeof obj === 'object' && obj.$ref;
}

const getAbsolute$Ref = (given$ref: string, baseFilePath: string) => {
  const [givenExternalFileRelativePath, givenRefPath] = given$ref.split('#');
  if (givenExternalFileRelativePath) {
    const cwd = dirname(baseFilePath);
    const givenExternalFilePath = isAbsolute(givenExternalFileRelativePath)
      ? givenExternalFileRelativePath
      : join(cwd, givenExternalFileRelativePath);
    if (givenRefPath) {
      return `${givenExternalFilePath}#${givenRefPath}`;
    }
    return givenExternalFilePath;
  }
  return `${baseFilePath}#${givenRefPath}`;
};
// eslint-disable-next-line @typescript-eslint/ban-types
export async function dereferenceObject<T extends object, TRoot = T>(
  obj: T,
  {
    cache = new InMemoryLRUCache(),
    config = {
      cwd: process.cwd(),
    },
    externalFileCache = new Map<string, any>(),
    refMap = new Map<string, any>(),
    root = obj as any,
  }: {
    cache?: KeyValueCache<any>;
    config?: ReadFileOrUrlOptions;
    externalFileCache?: Map<string, any>;
    refMap?: Map<string, any>;
    root?: TRoot;
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
          const externalFilePath = isAbsolute(externalRelativeFilePath)
            ? externalRelativeFilePath
            : join(config.cwd, externalRelativeFilePath);
          const newCwd = dirname(externalFilePath);
          let externalFile = externalFileCache.get(externalFilePath);
          const newConfig = {
            ...config,
            cwd: newCwd,
          };
          if (!externalFile) {
            externalFile = await readFileOrUrlWithCache(externalFilePath, cache, newConfig);
            externalFile = await healJSONSchema(externalFile);
            externalFileCache.set(externalFilePath, externalFile);
          }
          const fakeRefObject = {
            $ref: `#${refPath}`,
            ...externalFile,
          };
          return dereferenceObject(refPath ? fakeRefObject : externalFile, {
            cache,
            config: newConfig,
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
          });
        } else {
          const result = resolvePath(refPath, root);
          refMap.set($ref, result);
          return dereferenceObject(result, {
            cache,
            config,
            externalFileCache,
            refMap,
            root,
          });
        }
      }
    } else {
      await Promise.all(
        Object.entries(obj).map(async ([key, val]) => {
          obj[key] = await dereferenceObject<any>(val, { cache, config, externalFileCache, refMap, root });
        })
      );
    }
  }
  return obj;
}
