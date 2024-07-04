import type { FragmentDefinitionNode, SelectionSetNode } from 'graphql';

export function projectResultBySelectionSet({
  result,
  selectionSet,
  fragments = {},
}: {
  result: any;
  selectionSet: SelectionSetNode;
  fragments?: Record<string, FragmentDefinitionNode>;
}): any {
  if (!selectionSet?.selections?.length) {
    return result;
  }
  if (Array.isArray(result)) {
    return result.map(item => projectResultBySelectionSet({ result: item, selectionSet }));
  }
  if (typeof result === 'object' && result != null) {
    const projectedResult: any = {};
    for (const selection of selectionSet.selections) {
      switch (selection.kind) {
        case 'Field': {
          const originalFieldName = selection.name.value;
          const fieldResult = result[originalFieldName];
          if (fieldResult == null) {
            projectedResult[originalFieldName] = null;
            break;
          }
          const responseKey = selection.alias?.value || originalFieldName;
          projectedResult[responseKey] = projectResultBySelectionSet({
            result: fieldResult,
            selectionSet: selection.selectionSet,
            fragments,
          });
          break;
        }
        case 'FragmentSpread': {
          const fragmentName = selection.name.value;
          const fragment = fragments[fragmentName];
          if (!fragment) {
            throw new Error(`Fragment ${fragmentName} not found`);
          }
          Object.assign(
            projectedResult,
            projectResultBySelectionSet({ result, selectionSet: fragment.selectionSet, fragments }),
          );
          break;
        }
        case 'InlineFragment': {
          Object.assign(
            projectedResult,
            projectResultBySelectionSet({
              result,
              selectionSet: selection.selectionSet,
              fragments,
            }),
          );
          break;
        }
        default:
          throw new Error(`Unsupported selection kind ${selection.kind}`);
      }
    }
    return projectedResult;
  }
  return result;
}
