import { TypeInfo, type GraphQLSchema, type GraphQLType } from 'graphql';
import { memoize1, memoize2, type Maybe } from '@graphql-tools/utils';

export const getTypeInfo = memoize1(function getTypeInfo(schema: GraphQLSchema) {
  return new TypeInfo(schema);
});

export const getTypeInfoWithType = memoize2(function getTypeInfoWithType(
  schema: GraphQLSchema,
  type: Maybe<GraphQLType>,
) {
  return new TypeInfo(schema, type);
});
