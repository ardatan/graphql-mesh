import type { GraphQLScalarType } from 'graphql';

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

  scalar.serialize = coerceString;
  scalar.parseValue = coerceString;
  scalar.parseLiteral = ast => {
    if ('value' in ast) {
      return coerceString(ast.value);
    }
    return null;
  };
}
