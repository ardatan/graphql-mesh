import type { GraphQLScalarType, ValueNode } from 'graphql';

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

  function parseLiteral(ast: ValueNode) {
    if ('value' in ast) {
      return coerceString(ast.value);
    }
    return null;
  }

  Object.defineProperties(scalar, {
    serialize: { value: coerceString, configurable: true },
    parseValue: { value: coerceString, configurable: true },
    parseLiteral: { value: parseLiteral, configurable: true },
    coerceOutputValue: { value: coerceString, configurable: true },
    coerceInputValue: { value: coerceString, configurable: true },
    coerceInputLiteral: { value: parseLiteral, configurable: true },
  });
}
