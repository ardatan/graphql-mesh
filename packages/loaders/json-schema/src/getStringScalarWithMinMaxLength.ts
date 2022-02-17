import { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import { SchemaComposer } from 'graphql-compose';
import { getValidTypeName } from './getValidTypeName';

export function getStringScalarWithMinMaxLength({
  schemaComposer,
  subSchema,
}: {
  schemaComposer: SchemaComposer;
  subSchema: JSONSchemaObject;
}) {
  const name = getValidTypeName({
    schemaComposer,
    isInput: false,
    subSchema,
  });
  function coerceString(value: any) {
    if (value != null) {
      const vStr = value.toString();
      if (typeof subSchema.minLength !== 'undefined' && vStr.length < subSchema.minLength) {
        throw new Error(`${name} cannot be less than ${subSchema.minLength} but given ${vStr}`);
      }
      if (typeof subSchema.maxLength !== 'undefined' && vStr.length > subSchema.maxLength) {
        throw new Error(`${name} cannot be more than ${subSchema.maxLength} but given ${vStr}`);
      }
      return vStr;
    }
  }
  return schemaComposer.createScalarTC({
    name,
    description: subSchema.description,
    serialize: coerceString,
    parseValue: coerceString,
    parseLiteral: ast => {
      if ('value' in ast) {
        return coerceString(ast.value);
      }
      return null;
    },
    extensions: {
      codegenScalarType: 'string',
    },
  });
}
