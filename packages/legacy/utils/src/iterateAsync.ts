import { mapMaybePromise, type MaybePromise } from '@graphql-tools/utils';

export function iterateAsync<TInput, TOutput>(
  iterable: Iterable<TInput>,
  callback: (input: TInput, endEarly: VoidFunction) => MaybePromise<TOutput>,
  results?: TOutput[],
): MaybePromise<void> {
  const iterator = iterable[Symbol.iterator]();
  function iterate(): MaybePromise<void> {
    const { done: endOfIterator, value } = iterator.next();
    if (endOfIterator) {
      return;
    }
    let endedEarly = false;
    function endEarly() {
      endedEarly = true;
    }
    return mapMaybePromise(callback(value, endEarly), result => {
      if (endedEarly) {
        return;
      }
      if (result) {
        results?.push(result);
      }
      return iterate();
    });
  }
  return iterate();
}
