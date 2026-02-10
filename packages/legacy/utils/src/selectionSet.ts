import { Kind, type SelectionNode, type SelectionSetNode } from 'graphql';

export function selectionSetOfData(data: Record<string, unknown>): SelectionSetNode {
  const selSet = {
    kind: Kind.SELECTION_SET,
    selections: [] as SelectionNode[],
  } as const;
  for (const fieldName of Object.keys(data)) {
    const fieldValue = data[fieldName];
    const selNode: SelectionNode = {
      kind: Kind.FIELD,
      name: { kind: Kind.NAME, value: fieldName },
    };
    if (fieldValue && typeof fieldValue === 'object') {
      if (Array.isArray(fieldValue)) {
        // we assume that all items in the array are of the same shape, so we look at the first one
        const firstItem = fieldValue[0];
        if (firstItem && typeof firstItem === 'object') {
          selSet.selections.push({
            ...selNode,
            selectionSet: selectionSetOfData(firstItem as Record<string, unknown>),
          });
        } else {
          // is an array of scalars
          selSet.selections.push(selNode);
        }
      } else {
        selSet.selections.push({
          ...selNode,
          selectionSet: selectionSetOfData(fieldValue as Record<string, unknown>),
        });
      }
    } else {
      selSet.selections.push(selNode);
    }
  }
  return selSet;
}
