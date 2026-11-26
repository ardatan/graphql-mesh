import type { GraphQLResolveInfo } from 'graphql';
import type {
  GraphQLResolveInfo as ExecutorGraphQLResolveInfo,
  GraphQLResolveInfoHelpers,
} from '@graphql-tools/utils';

const asyncHelpers: GraphQLResolveInfoHelpers = {
  promiseAll: Promise.all.bind(Promise),
  track: () => undefined,
};

export function getGraphQLResolveInfo(
  info: GraphQLResolveInfo | undefined,
): ExecutorGraphQLResolveInfo | undefined {
  if (info == null || ('getAbortSignal' in info && 'getAsyncHelpers' in info)) {
    return info as ExecutorGraphQLResolveInfo | undefined;
  }
  return Object.assign(info, {
    getAbortSignal: () => undefined,
    getAsyncHelpers: () => asyncHelpers,
  });
}
