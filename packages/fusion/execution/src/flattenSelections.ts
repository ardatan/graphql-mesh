import { FieldNode, FragmentDefinitionNode, Kind, SelectionNode, SelectionSetNode } from 'graphql';

export interface FlattenedFieldNode extends FieldNode {
  selectionSet?: FlattenedSelectionSet;
  defer?: boolean;
}

export interface FlattenedSelectionSet extends SelectionSetNode {
  selections: FlattenedFieldNode[];
}

export function flattenSelections(
  selections: readonly SelectionNode[],
  fragments: Record<string, FragmentDefinitionNode>,
  defer = false,
): FlattenedFieldNode[] {
  return selections.flatMap(selection => {
    switch (selection.kind) {
      case Kind.FIELD:
        return [
          {
            ...selection,
            selectionSet: selection.selectionSet && {
              ...selection.selectionSet,
              selections: flattenSelections(selection.selectionSet.selections, fragments, defer),
            },
            defer,
          },
        ];
      case Kind.INLINE_FRAGMENT:
        if (selection.directives?.some(directive => directive.name.value === 'defer')) {
          defer = true;
        }
        return flattenSelections(selection.selectionSet.selections, fragments, defer);
      case Kind.FRAGMENT_SPREAD: {
        const fragment = fragments[selection.name.value];
        if (!fragment) {
          throw new Error(`No fragment found for ${selection.name.value}`);
        }
        if (fragment.directives?.some(directive => directive.name.value === 'defer')) {
          defer = true;
        }
        return flattenSelections(fragment.selectionSet.selections, fragments, defer);
      }
      default:
        throw new Error(`Unexpected selection node kind ${(selection as any).kind}`);
    }
  });
}
