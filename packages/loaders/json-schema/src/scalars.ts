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
