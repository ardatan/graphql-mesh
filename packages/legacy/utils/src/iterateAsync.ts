import { type MaybePromise } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export function iterateAsync<TInput, TOutput>(
  iterable: Iterable<TInput>,
  callback: (input: TInput, endEarly: VoidFunction) => MaybePromise<TOutput>,
  results?: TOutput[],
): MaybePromise<void> {
  if ((iterable as Array<TInput>)?.length === 0) {
    return;
  }
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
    return handleMaybePromise(
      () => callback(value, endEarly),
      result => {
        if (endedEarly) {
          return;
        }
        if (result) {
          results?.push(result);
        }
        return iterate();
      },
    );
  }
  return iterate();
}
