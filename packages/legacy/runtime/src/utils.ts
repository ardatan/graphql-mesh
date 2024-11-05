import type { ASTNode } from 'graphql';
import { BREAK, visit } from 'graphql';
import { getDocumentString, isGraphQLError } from '@envelop/core';
import { memoize1 } from '@graphql-tools/utils';

export const isStreamOperation = memoize1(function isStreamOperation(astNode: ASTNode): boolean {
  if (globalThis.process?.env?.DISABLE_JIT) {
    return true;
  }
  const documentStr = getDocumentString(astNode);
  let isStream = false;
  if (!documentStr || documentStr.includes('@stream')) {
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
  }
  return isStream;
});

export function getOriginalError(error: Error) {
  if (isGraphQLError(error)) {
    return getOriginalError(error.originalError);
  }
  return error;
}
