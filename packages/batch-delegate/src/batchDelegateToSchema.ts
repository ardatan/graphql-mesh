import { GraphQLError } from 'graphql';
import { pathToArray, relocatedError } from '@graphql-tools/utils';
import { getLoader } from './getLoader.js';
import { type BatchDelegateOptions } from './types.js';

export function batchDelegateToSchema<TContext = any, K = any, V = any, C = K>(
  options: BatchDelegateOptions<TContext, K, V, C>,
): any {
  const key = options.key;
  if (key == null) {
    return null;
  } else if (Array.isArray(key) && !key.length) {
    return [];
  }
  const loader = getLoader(options);
  const res = Array.isArray(key) ? loader.loadMany(key) : loader.load(key);
  return res.catch(error => {
    if (options.info?.path && error instanceof GraphQLError) {
      return relocatedError(error, pathToArray(options.info.path));
    }
    return error;
  });
}
