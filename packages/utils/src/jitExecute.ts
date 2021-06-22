import { ExecutionParams } from '@graphql-tools/delegate';
import { ExecutionResult } from '@graphql-tools/utils';
import { compileQuery, isCompiledQuery } from 'graphql-jit';
import { globalLruCache } from './global-lru-cache';
import { GraphQLSchema, print } from 'graphql';
import { Logger } from '@graphql-mesh/types';

export const jitExecutorFactory = (schema: GraphQLSchema, prefix: string, logger: Logger) => {
  return ({ document, variables, context }: ExecutionParams, operationName?: string, rootValue?: any) => {
    const documentStr = print(document);
    logger.debug(`Executing ${documentStr}`);
    const cacheKey = [prefix, documentStr, operationName].join('_');
    if (!globalLruCache.has(cacheKey)) {
      logger.debug(`Compiling ${documentStr}`);
      const compiledQuery: ReturnType<typeof compileQuery> = compileQuery(schema, document, operationName, {
        disableLeafSerialization: true,
        customJSONSerializer: true,
      });
      globalLruCache.set(cacheKey, compiledQuery);
    } else {
      logger.debug(`Compiled version found for ${documentStr}`);
    }
    const cachedQuery: ReturnType<typeof compileQuery> = globalLruCache.get(cacheKey);
    if (isCompiledQuery(cachedQuery)) {
      return cachedQuery.query(rootValue, context, variables);
    }
    return cachedQuery as ExecutionResult<any>;
  };
};
