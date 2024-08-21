export function withCancel<T, TAsyncIterable extends AsyncIterable<T>>(
  asyncIterable: TAsyncIterable,
  onCancel: () => void,
): AsyncIterable<T | undefined> {
  return new Proxy(asyncIterable, {
    get(asyncIterable, prop) {
      if (prop === Symbol.asyncIterator) {
        return function getIteratorWithCancel(): AsyncIterator<T> {
          const asyncIterator = asyncIterable[Symbol.asyncIterator]();
          return {
            next: asyncIterator.next ? (...args) => asyncIterator.next(...args) : undefined,
            return: async (...args) => {
              onCancel();
              if (asyncIterator.return) {
                return asyncIterator.return(...args);
              }
              return {
                value: undefined,
                done: true,
              };
            },
            throw: asyncIterator.throw ? (...args) => asyncIterator.throw(...args) : undefined,
          };
        };
      }
      const propVal = asyncIterable[prop as keyof TAsyncIterable];
      if (typeof propVal === 'function') {
        return propVal.bind(asyncIterable);
      }
      return propVal;
    },
  });
}
