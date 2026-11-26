import type { GraphQLResolveInfo } from 'graphql';
import { memoize3 } from '@graphql-tools/utils';
import { type OverrideHandler } from './types.js';

export const handleOverrideByDelegation = memoize3(function handleOverrideByDelegation(
  info: GraphQLResolveInfo,
  context: any,
  overrideHandler: OverrideHandler,
): boolean {
  return overrideHandler(context, info);
});
