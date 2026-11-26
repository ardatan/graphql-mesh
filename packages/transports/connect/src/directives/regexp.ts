import type { GraphQLScalarType, ValueNode } from 'graphql';

export function processRegExpAnnotations(scalar: GraphQLScalarType, pattern: string) {
  function coerceString(value: any) {
    if (value != null) {
      const vStr = value.toString();
      const regexp = new RegExp(pattern);
      if (!regexp.test(vStr)) {
        throw new Error(`${scalar.name} must match ${pattern} but given ${vStr}`);
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

  // GraphQL 16: serialize/parse*. GraphQL 17: coerceOutputValue/coerceInput*.
  Object.defineProperties(scalar, {
    serialize: { value: coerceString, configurable: true },
    parseValue: { value: coerceString, configurable: true },
    parseLiteral: { value: parseLiteral, configurable: true },
    coerceOutputValue: { value: coerceString, configurable: true },
    coerceInputValue: { value: coerceString, configurable: true },
    coerceInputLiteral: { value: parseLiteral, configurable: true },
  });
}
