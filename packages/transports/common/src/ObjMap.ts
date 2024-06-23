import { GraphQLScalarType } from 'graphql';

export const ObjMapScalar = new GraphQLScalarType({
  name: 'ObjMap',
  serialize: value => JSON.stringify(value),
  parseValue: value => JSON.parse(value.toString()),
  parseLiteral: ast => {
    if (ast.kind === 'StringValue') {
      return JSON.parse(ast.value);
    }
    return null;
  },
});
