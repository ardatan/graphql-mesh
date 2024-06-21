import { GraphQLScalarType } from 'graphql';

export const ObjMapScalar = new GraphQLScalarType({
  name: 'ObjMap',
  serialize: value => {
    const stringified = JSON.stringify(value);
    if (stringified.length > 255) {
      return null;
    }
    return stringified;
  },
  parseValue: value => JSON.parse(value.toString()),
  parseLiteral: ast => {
    if (ast.kind === 'StringValue') {
      return JSON.parse(ast.value);
    }
    return null;
  },
});
