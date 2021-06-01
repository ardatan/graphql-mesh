import { delegateToSchema, ICreateProxyingResolverOptions } from '@graphql-tools/delegate';
import { GraphQLFieldResolver } from 'graphql';

export function meshDefaultCreateProxyingResolver({
  subschemaConfig,
  operation,
  transformedSchema,
  fieldName,
}: ICreateProxyingResolverOptions): GraphQLFieldResolver<any, any> {
  return (rootValue, args, context, info) =>
    delegateToSchema({
      schema: subschemaConfig,
      operation,
      transformedSchema,
      fieldName,
      rootValue,
      args,
      context,
      info,
      skipValidation: true,
    });
}
