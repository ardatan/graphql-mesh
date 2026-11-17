import type { GraphQLScalarType } from 'graphql';

export function processLengthAnnotations(
  scalar: GraphQLScalarType,
  {
    min: minLength,
    max: maxLength,
  }: {
    min?: number;
    max?: number;
  },
) {
  function coerceString(value: any) {
    if (value != null) {
      const vStr = value.toString();
      if (typeof minLength !== 'undefined' && vStr.length < minLength) {
        throw new Error(`${scalar.name} cannot be less than ${minLength} but given ${vStr}`);
      }
      if (typeof maxLength !== 'undefined' && vStr.length > maxLength) {
        throw new Error(`${scalar.name} cannot be more than ${maxLength} but given ${vStr}`);
      }
      return vStr;
    }
  }

  scalar.serialize = coerceString;
  scalar.parseValue = coerceString;
  scalar.parseLiteral = ast => {
    if ('value' in ast) {
      return coerceString(ast.value);
    }
    return null;
  };
}
