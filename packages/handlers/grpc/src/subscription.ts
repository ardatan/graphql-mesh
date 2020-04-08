// https://github.com/apollographql/graphql-subscriptions/issues/99#issuecomment-400500956
export function withAsyncIteratorCancel<T>(asyncIterator: AsyncIterator<T>, onCancel: (...args: any[]) => any) {
  const oldReturn = asyncIterator.return?.bind(asyncIterator);
  asyncIterator.return = () => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
    return oldReturn ? oldReturn() : Promise.resolve({ value: undefined, done: true });
  };
  return asyncIterator;
}
