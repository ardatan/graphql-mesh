/* eslint-disable import/no-extraneous-dependencies */
import type { ExecutionResult } from 'graphql';
import { isAsyncIterable } from '@graphql-tools/utils';

export function assertAsyncIterable<T>(value: unknown): asserts value is AsyncIterable<T> {
  if (!isAsyncIterable(value)) {
    throw new Error(`Expected AsyncIterable`);
  }
}
export function assertNonAsyncIterable<T>(value: unknown): asserts value is ExecutionResult<T> {
  if (isAsyncIterable(value)) {
    throw new Error(`Expected non-AsyncIterable`);
  }
}
