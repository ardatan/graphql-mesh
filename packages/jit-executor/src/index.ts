import { ExecutionRequest, Executor, getOperationASTFromRequest, memoize1 } from '@graphql-tools/utils';
import { CompiledQuery, compileQuery, isCompiledQuery } from 'graphql-jit';
import { createLruCache, printWithCache } from '@graphql-mesh/utils';
import { ExecutionResult, GraphQLSchema } from 'graphql';
import { Logger } from '@graphql-mesh/types';

const getLruCacheForSchema = memoize1(function getLruCacheForSchema(schema: GraphQLSchema) {
  return createLruCache(1000, 3600);
});

export function createJITExecutor(schema: GraphQLSchema, prefix: string, logger: Logger): Executor {
  const lruCache = getLruCacheForSchema(schema);
  return function jitExecutor<TReturn>(request: ExecutionRequest) {
    const { document, variables, context, operationName, rootValue } = request;
    const documentStr = printWithCache(document);
    logger.debug(`Executing ${documentStr}`);
    const cacheKey = [prefix, documentStr, operationName].join('_');
    let compiledQueryFn: CompiledQuery['query'] | CompiledQuery['subscribe'] = lruCache.get(cacheKey);
    if (!compiledQueryFn) {
      logger.debug(`Compiling ${documentStr}`);
      const compiledQuery = compileQuery(schema, document, operationName);
      if (isCompiledQuery(compiledQuery)) {
        const { operation } = getOperationASTFromRequest(request);
        if (operation === 'subscription') {
          compiledQueryFn = compiledQuery.subscribe.bind(compiledQuery);
        } else {
          compiledQueryFn = compiledQuery.query.bind(compiledQuery);
        }
      } else {
        compiledQueryFn = () => compiledQuery;
      }
      lruCache.set(cacheKey, compiledQueryFn);
    } else {
      logger.debug(`Compiled version found for ${documentStr}`);
    }
    return compiledQueryFn(rootValue, context, variables) as ExecutionResult<TReturn>;
  };
}
