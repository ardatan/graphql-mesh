import Ajv from 'ajv';
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

export function getJSONSchemaStringFormatScalarMap(ajv: Ajv): Map<string, GraphQLScalarType> {
  const map = new Map<string, GraphQLScalarType>();
  for (const format of JSONSchemaStringFormats) {
    const schema = {
      type: 'string',
      format,
    };
    const validate = ajv.compile(schema);
    const coerceString = (value: string) => {
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
