import { KeyValueCache } from '@graphql-mesh/types';
import { JSONSchemaObject, JSONSchema } from '@json-schema-tools/meta-schema';
import { ReadFileOrUrlOptions, readFileOrUrlWithCache } from '@graphql-mesh/utils';
import { dirname, isAbsolute, join } from 'path';
import { resolvePath } from './getComposerFromJSONSchema';
import { healJSONSchema } from './healJSONSchema';
import { visitJSONSchema } from './visitJSONSchema';

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

const dereferencedJSONSchemaWeakMap = new WeakMap<JSONSchemaObject, any>();
export async function dereferenceJSONSchema(
  schema: string | JSONSchema,
  cache: KeyValueCache<any>,
  config: ReadFileOrUrlOptions,
  externalFileCache = new Map<string, JSONSchemaObject>(),
  refMap = new Map<string, JSONSchemaObject>()
) {
  if (typeof schema === 'string') {
    schema = {
      $ref: schema,
    };
  }
  return visitJSONSchema(
    typeof schema === 'object' ? { ...schema } : schema,
    async function visitorFn(subSchema): Promise<any> {
      if (typeof subSchema === 'object' && subSchema.$ref) {
        if (refMap.has(subSchema.$ref)) {
          return refMap.get(subSchema.$ref);
        }
        const [externalRelativeFilePath, refPath] = subSchema.$ref.split('#');
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
            externalFile = (await healJSONSchema(externalFile)) as JSONSchemaObject;
            externalFileCache.set(externalFilePath, externalFile);
          }
          const fakeRefObject = {
            $ref: `#${refPath}`,
            ...externalFile,
          };
          const result = await dereferenceJSONSchema(
            refPath ? fakeRefObject : externalFile,
            cache,
            newConfig,
            externalFileCache,
            new Proxy(refMap, {
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
                throw new Error('Not implemented');
              },
            })
          );
          return result;
        } else {
          const result = resolvePath(refPath, schema);
          refMap.set(subSchema.$ref, result);
          return result;
        }
      }
      return subSchema;
    },
    {
      path: '/',
      visitedSubschemaResultMap: dereferencedJSONSchemaWeakMap,
      keepObjectRef: true,
      reverse: false,
    }
  );
}
