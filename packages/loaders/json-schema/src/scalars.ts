import { GraphQLScalarType } from 'graphql';

export const GraphQLFile = new GraphQLScalarType({
  name: 'File',
  description: 'The `File` scalar type represents a file upload.',
  extensions: {
    codegenScalarType: 'File',
  },
});

export const GraphQLVoid = new GraphQLScalarType({
  name: 'Void',
  description: 'Represents empty values',
  serialize: () => '',
  extensions: {
    codegenScalarType: 'void',
  },
});

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
