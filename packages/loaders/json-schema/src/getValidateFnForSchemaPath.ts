import { memoize2 } from '@graphql-tools/utils';
import { JSONSchema } from 'json-machete';
import Ajv from 'packages/cli/node_modules/ajv/dist/ajv';

const ajvMemoizedCompile = memoize2(function ajvCompile(ajv: Ajv, jsonSchema: JSONSchema) {
  return ajv.compile(jsonSchema);
});

export function getValidateFnForSchemaPath(ajv: Ajv, path: string, schema: JSONSchema) {
  const fakeRefSchema = {
    $ref: `#/definitions/schema${path}`,
    definitions: {
      schema,
    },
  };
  return function validateWithJSONSchema(data: any) {
    const ajvValidate = ajvMemoizedCompile(ajv, fakeRefSchema);
    return ajvValidate(data);
  };
}
