import { delegateToSchema, ICreateProxyingResolverOptions } from '@graphql-tools/delegate';
import { GraphQLFieldResolver } from 'graphql';

export function meshDefaultCreateProxyingResolver({
  subschemaConfig,
  operation,
  transformedSchema,
}: ICreateProxyingResolverOptions): GraphQLFieldResolver<any, any> {
  return (_parent, _args, context, info) =>
    delegateToSchema({
      schema: subschemaConfig,
      operation,
      context,
      info,
      transformedSchema,
      skipValidation: true,
    });
}
