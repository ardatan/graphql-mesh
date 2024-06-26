import { GraphQLScalarType, valueFromASTUntyped } from 'graphql';

export const ObjMapScalar = new GraphQLScalarType({
  name: 'ObjMap',
  serialize: value => {
    if (typeof value === 'string') {
      return value;
    }
    const stringifiedValue = JSON.stringify(value);
    // TODO: Doesn't work due to a bug in graphql-js
    // if (stringifiedValue.length <= 255) {
    //   return value;
    // }
    return stringifiedValue;
  },
  parseValue: value => {
    if (typeof value === 'object') {
      return value;
    }
    try {
      return JSON.parse(value.toString());
    } catch (e) {
      return value;
    }
  },
  parseLiteral: (ast, variables) => {
    if (ast.kind === 'StringValue') {
      try {
        return JSON.parse(ast.value);
      } catch (e) {}
    }
    return valueFromASTUntyped(ast, variables);
  },
});
