import { Kind, type SelectionSetNode } from 'graphql';
import type { MergedTypeEntryPoint } from '@graphql-tools/delegate';
import { parseSelectionSet } from '@graphql-tools/utils';

/**
 * True when `parent` carries the fields of an entry's selectionSet, including
 * nested key paths like `{ organization { id } }`.
 * Used so multi-entry pick does not treat `{ upc: undefined }` from a naive
 * `({ upc }) => ({ upc })` key as a usable representation, and does not pick
 * an entry whose nested key object is empty.
 */
export function entryPointAppliesToParent(
  entryPoint: Pick<MergedTypeEntryPoint, 'selectionSet'>,
  parent: any,
): boolean {
  if (parent == null || entryPoint.selectionSet == null) {
    return parent != null;
  }
  const selectionSet =
    typeof entryPoint.selectionSet === 'string'
      ? parseSelectionSet(entryPoint.selectionSet, { noLocation: true })
      : entryPoint.selectionSet;
  return valueSatisfiesSelectionSet(parent, selectionSet);
}

function valueSatisfiesSelectionSet(value: any, selectionSet: SelectionSetNode): boolean {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      return false;
    }
    return value.every(item => item == null || valueSatisfiesSelectionSet(item, selectionSet));
  }
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      if (sel.name.value === '__typename') {
        continue;
      }
      const child = value[sel.name.value];
      if (child === undefined) {
        return false;
      }
      if (sel.selectionSet != null) {
        if (!valueSatisfiesSelectionSet(child, sel.selectionSet)) {
          return false;
        }
      }
      continue;
    }
    if (sel.kind === Kind.INLINE_FRAGMENT && sel.selectionSet != null) {
      const typeCondition = sel.typeCondition?.name.value;
      if (typeCondition != null) {
        const typename =
          value != null && typeof value === 'object'
            ? (value as { __typename?: unknown }).__typename
            : undefined;
        // Only apply type-conditioned fragments when they match the parent.
        if (typeof typename !== 'string' || typename !== typeCondition) {
          continue;
        }
      }
      if (!valueSatisfiesSelectionSet(value, sel.selectionSet)) {
        return false;
      }
    }
  }
  return true;
}
