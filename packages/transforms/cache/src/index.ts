import { addResolveFunctionsToSchema } from 'graphql-tools-fork';
import { GraphQLSchema } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import {
  composeResolvers,
  extractResolversFromSchema
} from '@graphql-toolkit/common';

export const cacheTransform: TransformFn<YamlConfig.CacheTransformConfig[]> = async ({
  schema,
  config,
  cache
}): Promise<GraphQLSchema> => {
  let resolvers = extractResolversFromSchema(schema);

  for (const cacheItem of config) {
    resolvers = composeResolvers(resolvers, {
      [cacheItem.field]: originalResolver => async (
        root: any,
        args: any,
        context: any,
        info: any
      ) => {
        return originalResolver(root, args, context, info);
      }
    });
  }

  return addResolveFunctionsToSchema({
    schema,
    resolvers
  });
};

export default cacheTransform;
