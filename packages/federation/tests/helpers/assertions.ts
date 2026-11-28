import { inspect } from 'util';
import { isAsyncIterable, type ExecutionResult } from '@graphql-tools/utils';

export function assertSingleExecutionValue(input: unknown): asserts input is ExecutionResult {
  if (isAsyncIterable(input)) {
    throw new Error('Expected single execution value, but received AsyncIterable.');
  }
}

export function assertAsyncIterable(value: any): asserts value is AsyncIterable<unknown> {
  if (typeof value?.[Symbol.asyncIterator] !== 'function') {
    throw new Error(`Expected AsyncIterable, but received ${inspect(value)}.`);
  }
}
