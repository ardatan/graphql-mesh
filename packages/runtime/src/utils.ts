import { ASTNode, BREAK, visit } from 'graphql';
import { isPromise, memoize1 } from '@graphql-tools/utils';

export function iterateAsync<TInput, TOutput>(
  iterable: Iterable<TInput>,
  callback: (input: TInput) => Promise<TOutput> | TOutput,
  results?: TOutput[],
): Promise<void> | void {
  const iterator = iterable[Symbol.iterator]();
  function iterate(): Promise<void> | void {
    const { done: endOfIterator, value } = iterator.next();
    if (endOfIterator) {
      return;
    }
    const result$ = callback(value);
    if (isPromise(result$)) {
      return result$.then(result => {
        if (result) {
          results?.push(result);
        }
        return iterate();
      });
    }
    if (result$) {
      results?.push(result$);
    }
    return iterate();
  }
  return iterate();
}

export const isStreamOperation = memoize1(function isStreamOperation(astNode: ASTNode): boolean {
  let isStream = false;
  visit(astNode, {
    Field: {
      enter(node): typeof BREAK {
        if (node.directives?.some(d => d.name.value === 'stream')) {
          isStream = true;
          return BREAK;
        }
        return undefined;
      },
    },
  });
  return isStream;
});
