import { addResolveFunctionsToSchema } from 'graphql-tools-fork';
import { GraphQLSchema, GraphQLResolveInfo } from 'graphql';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import {
  composeResolvers,
  extractResolversFromSchema,
  ResolversComposerMapping,
  ResolversComposition
} from '@graphql-toolkit/common';
import Interpolator from 'string-interpolation';
import { format } from 'date-fns';
import objectHash from 'object-hash';

const interpolator = new Interpolator({
  delimiter: ['{', '}']
});
interpolator.addAlias('typeName', 'info.parentType.name');
interpolator.addAlias('type', 'info.parentType.name');
interpolator.addAlias('parentType', 'info.parentType.name');
interpolator.addAlias('fieldName', 'info.fieldName');
interpolator.registerModifier('date', (formatStr: string) =>
  format(new Date(), formatStr)
);
interpolator.registerModifier('hash', (value: any) =>
  objectHash(value, { ignoreUnknown: true })
);

export const cacheTransform: TransformFn<YamlConfig.CacheTransformConfig[]> = async ({
  schema,
  config,
  cache,
  hooks
}): Promise<GraphQLSchema> => {
  const sourceResolvers = extractResolversFromSchema(schema);
  const compositions: ResolversComposerMapping = {};

  for (const cacheItem of config) {
    const effectingOperations = cacheItem.invalidate?.effectingOperations || [];

    if (effectingOperations.length > 0) {
      hooks.on('resolverDone', async (resolverInfo, result) => {
        const effectingRule = effectingOperations.find(
          o =>
            o.operation ===
            `${resolverInfo.info.parentType.name}.${resolverInfo.info.fieldName}`
        );

        if (effectingRule) {
          const cacheKey = computeCacheKey({
            keyStr: effectingRule.matchKey,
            args: resolverInfo.args,
            info: resolverInfo.info
          });

          await cache.delete(cacheKey);
        }
      });
    }

    compositions[cacheItem.field] = <ResolversComposition>(
      (originalResolver => async (
        root: any,
        args: any,
        context: any,
        info: GraphQLResolveInfo
      ) => {
        const cacheKey = computeCacheKey({
          keyStr: cacheItem.cacheKey,
          args,
          info
        });

        const cachedValue = await cache.get(cacheKey);

        if (cachedValue) {
          return cachedValue;
        }

        const resolverResult = await originalResolver(
          root,
          args,
          context,
          info
        );

        await cache.set(cacheKey, resolverResult, {
          ttl: cacheItem.invalidate?.ttl || undefined
        });

        return resolverResult;
      })
    );
  }

  const wrappedResolvers = composeResolvers(sourceResolvers, compositions);

  return addResolveFunctionsToSchema({
    schema,
    resolvers: wrappedResolvers
  });
};

export function computeCacheKey(options: {
  keyStr: string | undefined;
  args: Record<string, any>;
  info: GraphQLResolveInfo;
}): string {
  const argsHash = options.args
  ? objectHash(options.args, { ignoreUnknown: true })
  : '';

  if (!options.keyStr) {
    return `${options.info.parentType.name}-${options.info.fieldName}-${argsHash}`;
  }

  const templateData = {
    args: options.args,
    argsHash,
    info: options.info || null
  };

  return interpolator.parse(options.keyStr, templateData);
}

export default cacheTransform;
