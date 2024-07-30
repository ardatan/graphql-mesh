import type { SelectionSetNode } from 'graphql';

export function checkIfDataSatisfiesSelectionSet(selectionSet: SelectionSetNode, data: any) {
  if (Array.isArray(data)) {
    return data.every(item => checkIfDataSatisfiesSelectionSet(selectionSet, item));
  }
  for (const selection of selectionSet.selections) {
    if (selection.kind === 'Field') {
      const field = selection;
      const responseKey = field.alias?.value || field.name.value;
      if (data[responseKey] != null) {
        if (field.selectionSet) {
          if (!checkIfDataSatisfiesSelectionSet(field.selectionSet, data[field.name.value])) {
            return false;
          }
        }
      } else {
        return false;
      }
    } else if (selection.kind === 'InlineFragment') {
      const inlineFragment = selection;
      if (!checkIfDataSatisfiesSelectionSet(inlineFragment.selectionSet, data)) {
        return false;
      }
    }
  }
  return true;
}
