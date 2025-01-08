export function withCancel<T, TAsyncIterable extends AsyncIterable<T>>(
  asyncIterable: TAsyncIterable,
  onCancel: (value?: any) => void,
): AsyncIterable<T | undefined> {
  return new Proxy(asyncIterable, {
    get(asyncIterable, prop) {
      if (prop === Symbol.asyncIterator) {
        return function getIteratorWithCancel(): AsyncIterator<T> {
          const asyncIterator = asyncIterable[Symbol.asyncIterator]();
          return {
            next: asyncIterator.next ? (...args) => asyncIterator.next(...args) : undefined,
            return: async value => {
              onCancel(value);
              if (asyncIterator.return) {
                return asyncIterator.return(value);
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
