import { inspect } from '@graphql-tools/utils';
import { JSONSchemaObject } from 'json-machete';
import { GraphQLJSON, SchemaComposer } from 'graphql-compose';
import { getValidTypeName } from './getValidTypeName';

export function getGenericJSONScalar({
  isInput,
  subSchema,
  schemaComposer,
  validateWithJSONSchema,
}: {
  isInput: boolean;
  subSchema: JSONSchemaObject;
  schemaComposer: SchemaComposer<any>;
  validateWithJSONSchema: (data: any) => boolean;
}) {
  function coerceGenericJSONScalar(value: any) {
    if (!validateWithJSONSchema(value)) {
      throw new Error(`${inspect(value)} is not valid!`);
    }
    return value;
  }
  return schemaComposer.createScalarTC({
    name: getValidTypeName({
      schemaComposer,
      isInput,
      subSchema,
    }),
    description: subSchema.description,
    serialize: coerceGenericJSONScalar,
    parseValue: coerceGenericJSONScalar,
    parseLiteral(...args) {
      const value = GraphQLJSON.parseLiteral(...args);
      return coerceGenericJSONScalar(value);
    },
  });
}
