import { ExecutionParams } from '@graphql-tools/delegate';
import { compileQuery, isCompiledQuery } from 'graphql-jit';
import { globalLruCache } from './global-lru-cache';
import { GraphQLSchema, print } from 'graphql';
import { Logger } from '@graphql-mesh/types';

type CompileQueryResult = ReturnType<typeof compileQuery>;

export const jitExecutorFactory = (schema: GraphQLSchema, prefix: string, logger: Logger) => {
  return ({ document, variables, context, operationName, rootValue }: ExecutionParams) => {
    const documentStr = print(document);
    logger.debug(`Executing ${documentStr}`);
    const cacheKey = [prefix, documentStr, operationName].join('_');
    let compiledQuery: CompileQueryResult;
    if (!globalLruCache.has(cacheKey)) {
      logger.debug(`Compiling ${documentStr}`);
      compiledQuery = compileQuery(schema, document, operationName, {
        disableLeafSerialization: true,
        customJSONSerializer: true,
      });
      globalLruCache.set(cacheKey, compiledQuery);
    } else {
      logger.debug(`Compiled version found for ${documentStr}`);
      compiledQuery = globalLruCache.get(cacheKey);
    }
    if (isCompiledQuery(compiledQuery)) {
      return compiledQuery.query(rootValue, context, variables);
    }
    return compiledQuery;
  };
};
