import { ExecutionParams } from '@graphql-tools/delegate';
import { ExecutionResult } from '@graphql-tools/utils';
import { compileQuery, isCompiledQuery } from 'graphql-jit';
import { globalLruCache } from './global-lru-cache';
import { GraphQLSchema, print } from 'graphql';

export const jitExecutorFactory = (schema: GraphQLSchema, prefix: string) => (
  { document, variables, context }: ExecutionParams,
  operationName?: string,
  rootValue?: any
) => {
  const documentStr = print(document);
  const cacheKey = [prefix, documentStr, operationName].join('_');
  if (!globalLruCache.has(cacheKey)) {
    const compiledQuery: ReturnType<typeof compileQuery> = compileQuery(schema, document, operationName, {
      disableLeafSerialization: true,
      customJSONSerializer: true,
    });
    globalLruCache.set(cacheKey, compiledQuery);
  }
  const cachedQuery: ReturnType<typeof compileQuery> = globalLruCache.get(cacheKey);
  if (isCompiledQuery(cachedQuery)) {
    return cachedQuery.query(rootValue, context, variables);
  }
  return cachedQuery as ExecutionResult<any>;
};
