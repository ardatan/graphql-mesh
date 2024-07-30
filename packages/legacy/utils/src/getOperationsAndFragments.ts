import type { DocumentNode, FragmentDefinitionNode, OperationDefinitionNode } from 'graphql';
import { memoize1 } from '@graphql-tools/utils';

export const getOperationsAndFragments = memoize1(function getOperationsAndFragments(
  document: DocumentNode,
) {
  const fragments: Record<string, FragmentDefinitionNode> = Object.create(null);
  const operations: Record<string, OperationDefinitionNode> = Object.create(null);
  for (const definition of document.definitions) {
    if (definition.kind === 'OperationDefinition') {
      operations[definition.name.value] = definition;
    } else if (definition.kind === 'FragmentDefinition') {
      fragments[definition.name.value] = definition;
    }
  }
  return {
    operations,
    fragments,
  };
});
