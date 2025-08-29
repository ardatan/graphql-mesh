/* eslint-disable no-labels */
import { Kind, type SelectionSetNode } from 'graphql';

/**
 * Checks recursively whether all of the fields of {@link requiredSelSet} exist in {@link selSet}
 */
export function containsSelectionSet(
  requiredSelSet: SelectionSetNode,
  selSet: SelectionSetNode,
): boolean {
  ReqLoop: for (const reqSel of requiredSelSet.selections) {
    switch (reqSel.kind) {
      case Kind.FIELD: {
        for (const sel of selSet.selections) {
          // required field exists in the selection set
          if (sel.kind === Kind.FIELD && sel.name.value === reqSel.name.value) {
            if (!reqSel.selectionSet && !sel.selectionSet) {
              // they're both scalar fields, continue to next required field
              continue ReqLoop;
            }
            if (reqSel.selectionSet && !sel.selectionSet) {
              // required field is an object, but the selection under the same name is scalar
              return false;
            }
            if (!reqSel.selectionSet && sel.selectionSet) {
              // required field is a scalar, but the required selection under the same name is scalar
              return false;
            }
            // they're both objects
            if (containsSelectionSet(reqSel.selectionSet!, sel.selectionSet!)) {
              // and they recursively contain all required fields
              continue ReqLoop;
            }
          }
        }
        // no matches found
        return false;
      }
      case Kind.INLINE_FRAGMENT: {
        for (const sel of selSet.selections) {
          if (sel.kind !== Kind.INLINE_FRAGMENT) {
            continue;
          }
          if (
            sel.typeCondition?.name.value &&
            reqSel.typeCondition?.name.value &&
            sel.typeCondition.name.value === reqSel.typeCondition.name.value
          ) {
            // both have matching type conditions
            if (containsSelectionSet(reqSel.selectionSet, sel.selectionSet)) {
              // and they recursively contain all required fields
              continue ReqLoop;
            }
          }
          if (!sel.typeCondition?.name.value && !reqSel.typeCondition?.name.value) {
            // neither have a type condition, just check the selection sets
            if (containsSelectionSet(reqSel.selectionSet, sel.selectionSet)) {
              // and they recursively contain all required fields
              continue ReqLoop;
            }
          }
        }
        return false;
      }
      default:
        // no other field kind is supported, like fragment spreads or definitions
        return false;
    }
  }
  // all fields matched
  return true;
}
