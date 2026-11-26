import {
  getNamedType,
  isAbstractType,
  isInterfaceType,
  isLeafType,
  isObjectType,
  isUnionType,
  Kind,
  type FieldNode,
  type FragmentDefinitionNode,
  type FragmentSpreadNode,
  type GraphQLField,
  type GraphQLInterfaceType,
  type GraphQLNamedOutputType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type InlineFragmentNode,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';

export function extractUnavailableFieldsFromSelectionSet(
  schema: GraphQLSchema,
  fieldType: GraphQLNamedOutputType,
  fieldSelectionSet: SelectionSetNode,
  shouldAdd: (fieldType: GraphQLObjectType | GraphQLInterfaceType, selection: FieldNode) => boolean,
  fragments: Record<string, FragmentDefinitionNode> = {},
) {
  if (isLeafType(fieldType)) {
    return [];
  }
  if (isUnionType(fieldType)) {
    const unavailableSelections: SelectionNode[] = [];
    for (const type of fieldType.getTypes()) {
      // Exclude other inline fragments
      const fieldSelectionExcluded: SelectionSetNode = {
        ...fieldSelectionSet,
        // Untyped inline fragments apply to every union member; typed ones only when they match.
        selections: fieldSelectionSet.selections.filter(selection =>
          selection.kind === Kind.INLINE_FRAGMENT
            ? selection.typeCondition
              ? selection.typeCondition.name.value === type.name
              : true
            : true,
        ),
      };
      unavailableSelections.push(
        ...extractUnavailableFieldsFromSelectionSet(
          schema,
          type,
          fieldSelectionExcluded,
          shouldAdd,
          fragments,
        ),
      );
    }
    return unavailableSelections;
  }
  const subFields = fieldType.getFields();
  const unavailableSelections: SelectionNode[] = [];
  for (const selection of fieldSelectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      if (selection.name.value === '__typename') {
        continue;
      }
      const fieldName = selection.name.value;
      const selectionField = subFields[fieldName];
      if (!selectionField) {
        if (shouldAdd(fieldType, selection)) {
          unavailableSelections.push(selection);
        }
      } else {
        const unavailableSubFields = extractUnavailableFields(
          schema,
          selectionField,
          selection,
          shouldAdd,
          fragments,
        );
        if (unavailableSubFields.length) {
          unavailableSelections.push({
            ...selection,
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: unavailableSubFields,
            },
          });
        }
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      const subFieldName = selection.typeCondition?.name.value || fieldType.name;
      const subFieldType =
        (selection.typeCondition && (schema.getType(subFieldName) as GraphQLObjectType)) ||
        fieldType;
      if (
        subFieldName === fieldType.name ||
        ((isObjectType(subFieldType) || isInterfaceType(subFieldType)) &&
          isAbstractType(fieldType) &&
          schema.isSubType(fieldType, subFieldType))
      ) {
        const unavailableFields = extractUnavailableFieldsFromSelectionSet(
          schema,
          subFieldType,
          selection.selectionSet,
          shouldAdd,
          fragments,
        );
        if (unavailableFields.length) {
          unavailableSelections.push({
            ...selection,
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: unavailableFields,
            },
          });
        }
      } else if (isObjectType(subFieldType) || isInterfaceType(subFieldType)) {
        const unavailableSubSelections: SelectionNode[] = [];
        const subFieldTypeFields = subFieldType.getFields();
        for (const subSelection of selection.selectionSet.selections) {
          if (subSelection.kind === Kind.FIELD) {
            const subSelectionFieldName = subSelection.name.value;
            if (subSelectionFieldName === '__typename') {
              continue;
            }
            const subSelectionField = subFieldTypeFields[subSelection.name.value];
            if (!subSelectionField) {
              if (shouldAdd(subFieldType, subSelection)) {
                unavailableSubSelections.push(subSelection);
              }
            }
          }
        }
        if (unavailableSubSelections.length) {
          // Preserve the inline fragment wrapper so the type condition is not lost
          unavailableSelections.push({
            ...selection,
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: unavailableSubSelections,
            },
          });
        }
      }
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const fragment = fragments[selection.name.value];
      if (fragment) {
        const fragmentUnavailableFields = extractUnavailableFieldsFromSelectionSet(
          schema,
          fieldType,
          {
            kind: Kind.SELECTION_SET,
            selections: [
              {
                kind: Kind.INLINE_FRAGMENT,
                // Preserve @include/@skip (etc.) from the spread onto the expansion.
                directives: selection.directives,
                typeCondition: {
                  kind: Kind.NAMED_TYPE,
                  name: {
                    kind: Kind.NAME,
                    value: fragment.typeCondition.name.value,
                  },
                },
                selectionSet: fragment.selectionSet,
              },
            ],
          },
          shouldAdd,
          fragments,
        );
        if (fragmentUnavailableFields.length) {
          unavailableSelections.push(...fragmentUnavailableFields);
        }
      }
    }
  }
  return unavailableSelections;
}

export function extractUnavailableFields(
  schema: GraphQLSchema,
  field: GraphQLField<any, any>,
  fieldNode: FieldNode,
  shouldAdd: (fieldType: GraphQLObjectType | GraphQLInterfaceType, selection: FieldNode) => boolean,
  fragments: Record<string, FragmentDefinitionNode> = {},
) {
  if (fieldNode.selectionSet) {
    const fieldType = getNamedType(field.type);
    return extractUnavailableFieldsFromSelectionSet(
      schema,
      fieldType,
      fieldNode.selectionSet,
      shouldAdd,
      fragments,
    );
  }
  return [];
}

export function subtractSelectionSets(
  selectionSetA: SelectionSetNode,
  selectionSetB: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode> = {},
): SelectionSetNode {
  const newSelections: SelectionNode[] = [];
  for (const selectionA of selectionSetA.selections) {
    switch (selectionA.kind) {
      case Kind.FIELD: {
        const fieldA = selectionA as FieldNode;
        const fieldsInOtherSelectionSet = selectionSetB.selections.filter(subselectionB => {
          if (subselectionB.kind !== Kind.FIELD) {
            return false;
          }
          return fieldA.name.value === subselectionB.name.value;
        }) as FieldNode[];
        if (fieldsInOtherSelectionSet.length > 0 && fieldA.selectionSet?.selections?.length) {
          const newSubSelection = fieldsInOtherSelectionSet.reduce(
            (acc, fieldB) =>
              fieldB.selectionSet
                ? subtractSelectionSets(acc, fieldB.selectionSet, fragments)
                : acc,
            {
              kind: Kind.SELECTION_SET,
              selections: fieldA.selectionSet.selections,
            } as SelectionSetNode,
          );
          if (newSubSelection.selections.length) {
            newSelections.push({
              ...fieldA,
              selectionSet: newSubSelection,
            });
          }
        } else if (fieldsInOtherSelectionSet.length === 0) {
          newSelections.push(selectionA);
        }
        break;
      }
      case Kind.INLINE_FRAGMENT: {
        const inlineFragmentA = selectionA as InlineFragmentNode;
        const inlineFragmentsFromB = selectionSetB.selections.filter(subselectionB => {
          if (subselectionB.kind !== Kind.INLINE_FRAGMENT) {
            return false;
          }
          const inlineFragmentB = subselectionB as InlineFragmentNode;
          return (
            inlineFragmentA.typeCondition?.name.value === inlineFragmentB.typeCondition?.name.value
          );
        }) as InlineFragmentNode[];
        if (inlineFragmentsFromB.length > 0) {
          const newSubSelection = inlineFragmentsFromB.reduce(
            (acc, subselectionB) =>
              subselectionB.selectionSet
                ? subtractSelectionSets(acc, subselectionB.selectionSet, fragments)
                : acc,
            {
              kind: Kind.SELECTION_SET,
              selections: inlineFragmentA.selectionSet.selections,
            } as SelectionSetNode,
          );
          if (newSubSelection.selections.length) {
            if (newSubSelection.selections.length === 1) {
              const onlySelection = newSubSelection.selections[0];
              if (onlySelection?.kind === Kind.FIELD) {
                const responseKey = onlySelection.alias?.value || onlySelection.name.value;
                if (responseKey === '__typename') {
                  continue;
                }
              }
            }
            newSelections.push({
              ...inlineFragmentA,
              selectionSet: newSubSelection,
            });
          }
        } else {
          newSelections.push(selectionA);
        }
        break;
      }
      case Kind.FRAGMENT_SPREAD: {
        const fragmentSpreadA = selectionA as FragmentSpreadNode;
        const fragment = fragments[fragmentSpreadA.name.value];
        if (fragment) {
          // compare the fragment's fields directly so nested @provides fields can be removed
          const newSubSelection = subtractSelectionSets(
            fragment.selectionSet,
            selectionSetB,
            fragments,
          );
          if (newSubSelection.selections.length) {
            // keep the type condition and directives when only part of the fragment remains
            newSelections.push({
              kind: Kind.INLINE_FRAGMENT,
              typeCondition: fragment.typeCondition,
              directives: [...(fragment.directives ?? []), ...(fragmentSpreadA.directives ?? [])],
              selectionSet: newSubSelection,
            });
          }
        } else if (
          !selectionSetB.selections.some(
            subselectionB =>
              subselectionB.kind === Kind.FRAGMENT_SPREAD &&
              subselectionB.name.value === fragmentSpreadA.name.value,
          )
        ) {
          newSelections.push(selectionA);
        }
        break;
      }
    }
  }
  return {
    kind: Kind.SELECTION_SET,
    selections: newSelections,
  };
}
