import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { GraphQLScalarType, Kind } from 'graphql';
import { pascalCase } from 'pascal-case';

const JSONSchemaStringFormats = [
  'date',
  'hostname',
  'regex',
  'json-pointer',
  'relative-json-pointer',
  'uri-reference',
  'uri-template',
];

export function getJSONSchemaStringFormatScalarMap(): Map<string, GraphQLScalarType> {
  const ajv = new Ajv({
    strict: false,
  });
  addFormats(ajv);
  const map = new Map<string, GraphQLScalarType>();
  for (const format of JSONSchemaStringFormats) {
    const schema = {
      type: 'string',
      format,
    };
    let validate: (value: unknown) => boolean;
    try {
      validate = ajv.compile(schema);
    } catch (e) {
      validate = (value: unknown) => ajv.validate(schema, value);
    }
    const coerceString = (value: unknown) => {
      if (validate(value)) {
        return value;
      }
      throw new Error(`Expected ${format} but got: ${value}`);
    };
    const scalar = new GraphQLScalarType({
      name: pascalCase(format),
      description: `Represents ${format} values`,
      serialize: coerceString,
      parseValue: coerceString,
      parseLiteral: ast => {
        if (ast.kind === Kind.STRING) {
          return coerceString(ast.value);
        }
        throw new Error(`Expected string in ${format} format but got: ${(ast as any).value}`);
      },
      extensions: {
        codegenScalarType: 'string',
      },
    });
    map.set(format, scalar);
  }
  return map;
}
