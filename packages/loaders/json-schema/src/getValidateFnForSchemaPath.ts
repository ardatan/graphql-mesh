import { memoize2 } from '@graphql-tools/utils';
import { JSONSchema, resolvePath } from 'json-machete';
import Ajv from 'ajv';

const ajvMemoizedCompile = memoize2(function ajvCompile(ajv: Ajv, jsonSchema: JSONSchema) {
  return ajv.compile(
    typeof jsonSchema === 'object'
      ? {
          ...jsonSchema,
          $schema: undefined,
        }
      : jsonSchema
  );
});

export function getValidateFnForSchemaPath(ajv: Ajv, path: string, schema: JSONSchema) {
  const subSchema = resolvePath(path, schema);
  const fn = function validateFn(data: any) {
    const ajvValidateFn = ajvMemoizedCompile(ajv, subSchema);
    return ajvValidateFn(data);
  };
  Object.defineProperty(fn, 'errors', {
    get() {
      return ajvMemoizedCompile(ajv, subSchema).errors;
    },
  });
  return fn;
}
