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
  return ajvMemoizedCompile(ajv, subSchema);
}
