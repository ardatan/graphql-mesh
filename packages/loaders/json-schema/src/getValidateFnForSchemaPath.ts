import { memoize2 } from '@graphql-tools/utils';
import { JSONSchema, resolvePath } from 'json-machete';
import Ajv from 'packages/cli/node_modules/ajv/dist/ajv';

const ajvMemoizedCompile = memoize2(function ajvCompile(ajv: Ajv, jsonSchema: JSONSchema) {
  return ajv.compile(jsonSchema);
});

export function getValidateFnForSchemaPath(ajv: Ajv, path: string, schema: JSONSchema) {
  const subSchema = resolvePath(path, schema);
  return function validateWithJSONSchema(data: any) {
    const ajvValidate = ajvMemoizedCompile(ajv, subSchema);
    return ajvValidate(data);
  };
}
