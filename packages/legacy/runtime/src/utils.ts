import { ASTNode, BREAK, visit } from 'graphql';
import { getDocumentString } from '@envelop/core';
import { memoize1 } from '@graphql-tools/utils';

export const isStreamOperation = memoize1(function isStreamOperation(astNode: ASTNode): boolean {
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
