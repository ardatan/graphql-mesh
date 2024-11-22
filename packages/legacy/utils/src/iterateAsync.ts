import { mapMaybePromise, type MaybePromise } from '@graphql-tools/utils';

export function iterateAsync<TInput, TOutput>(
  iterable: Iterable<TInput>,
  callback: (input: TInput) => MaybePromise<TOutput>,
  results?: TOutput[],
): MaybePromise<void> {
  const iterator = iterable[Symbol.iterator]();
  function iterate(): MaybePromise<void> {
    const { done: endOfIterator, value } = iterator.next();
    if (endOfIterator) {
      return;
    }
    return mapMaybePromise(callback(value), result => {
      if (result) {
        results?.push(result);
      }
      return iterate();
    });
  }
  return iterate();
}
