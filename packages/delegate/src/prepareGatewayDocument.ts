import {
  getNamedType,
  isAbstractType,
  isInterfaceType,
  isLeafType,
  isObjectType,
  Kind,
  visit,
  visitWithTypeInfo,
  type ArgumentNode,
  type DocumentNode,
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLInterfaceType,
  type GraphQLNamedOutputType,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLSchema,
  type InlineFragmentNode,
  type SelectionNode,
  type SelectionSetNode,
  type TypeInfo,
  type ValueNode,
} from 'graphql';
import {
  getRootTypeNames,
  implementsAbstractType,
  memoize2,
  type ASTVisitorKeyMap,
} from '@graphql-tools/utils';
import { getDocumentMetadata } from './getDocumentMetadata.js';
import { getTypeInfo } from './getTypeInfo.js';
import { handleOverrideByDelegation } from './handleOverrideByDelegation.js';
import { type DelegationContext, type StitchingInfo } from './types.js';

/** First parent type name, or a Set once the same selection is seen under multiple parents. */
type VisitedParents = string | Set<string>;

type SelectionSatisfactionCache = WeakMap<SelectionSetNode, Map<string, boolean>>;

export function prepareGatewayDocument(
  originalDocument: DocumentNode,
  delegationContext: DelegationContext<any>,
): DocumentNode {
  const transformedSchema = delegationContext.transformedSchema;
  const returnType = delegationContext.returnType;
  const infoSchema = delegationContext.info?.schema;

  const wrappedConcreteTypesDocument = wrapConcreteTypes(
    returnType,
    transformedSchema,
    originalDocument,
  );

  if (infoSchema == null) {
    return wrappedConcreteTypesDocument;
  }

  // Track visits per parent type so the same selection node under a different
  // parent still receives required extra-type copies. Store a single string
  // until a second parent appears to avoid allocating a Set on the common path.
  const visitedSelections = new WeakMap<SelectionNode, VisitedParents>();
  // Request-local memo keyed by selection-set identity + type name (no stringify).
  const selectionSatisfactionCache: SelectionSatisfactionCache = new WeakMap();

  const {
    possibleTypesMap,
    reversePossibleTypesMap,
    interfaceExtensionsMap,
    fieldNodesByType,
    fieldNodesByField,
    dynamicSelectionSetsByField,
  } = getSchemaMetaData(infoSchema, transformedSchema);

  const { operations, fragments, fragmentNames } = getDocumentMetadata(
    wrappedConcreteTypesDocument,
  );

  const { expandedFragments, fragmentReplacements } = getExpandedFragments(
    fragments,
    fragmentNames,
    possibleTypesMap,
  );

  // Memoized TypeInfo per schema (successful visits leave it balanced).
  const typeInfo = getTypeInfo(transformedSchema);

  const expandedDocument: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: [...operations, ...fragments, ...expandedFragments],
  };

  const fragmentMap = Object.create(null);
  for (const fragment of expandedDocument.definitions) {
    if (fragment.kind === Kind.FRAGMENT_DEFINITION) {
      fragmentMap[fragment.name.value] = fragment;
    }
  }

  const visitorKeyMap: ASTVisitorKeyMap = {
    Document: ['definitions'],
    OperationDefinition: ['selectionSet'],
    SelectionSet: ['selections'],
    Field: ['selectionSet'],
    InlineFragment: ['selectionSet'],
    FragmentDefinition: ['selectionSet'],
  };

  return visit(
    expandedDocument,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET]: node =>
        visitSelectionSet(
          node,
          fragmentReplacements,
          transformedSchema,
          typeInfo,
          possibleTypesMap,
          reversePossibleTypesMap,
          interfaceExtensionsMap,
          fieldNodesByType,
          fieldNodesByField,
          dynamicSelectionSetsByField,
          infoSchema,
          visitedSelections,
          fragmentMap,
          delegationContext,
          selectionSatisfactionCache,
        ),
    }),
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    visitorKeyMap as any,
  );
}

const getExtraPossibleTypesFn = memoize2(function getExtraPossibleTypes(
  transformedSchema: GraphQLSchema,
  infoSchema: GraphQLSchema,
) {
  const extraPossiblesTypesMap = new Map<string, Set<string>>();
  return function getExtraPossibleTypes(typeName: string) {
    let extraTypesForSubschema = extraPossiblesTypesMap.get(typeName);
    if (!extraTypesForSubschema) {
      extraTypesForSubschema = new Set<string>();
      const gatewayType = infoSchema.getType(typeName);
      const subschemaType = transformedSchema.getType(typeName);
      if (isAbstractType(gatewayType) && isAbstractType(subschemaType)) {
        const possibleTypes = infoSchema.getPossibleTypes(gatewayType);
        const possibleTypesInSubschema = transformedSchema.getPossibleTypes(subschemaType);
        for (const possibleType of possibleTypes) {
          const possibleTypeInSubschema = transformedSchema.getType(possibleType.name);
          // If it doesn't exist in the subschema
          if (!possibleTypeInSubschema) {
            continue;
          }
          // If it is a possible type in the gateway schema, it should be a possible type in the subschema
          if (
            possibleTypeInSubschema &&
            possibleTypesInSubschema.some(t => t.name === possibleType.name)
          ) {
            continue;
          }
          extraTypesForSubschema.add(possibleType.name);
        }
      }
      extraPossiblesTypesMap.set(typeName, extraTypesForSubschema);
    }
    return extraTypesForSubschema;
  };
});

function visitSelectionSet(
  node: SelectionSetNode,
  fragmentReplacements: Record<string, Array<{ fragmentName: string; typeName: string }>>,
  transformedSchema: GraphQLSchema,
  typeInfo: TypeInfo,
  possibleTypesMap: Record<string, Array<string>>,
  reversePossibleTypesMap: Record<string, Array<string>>,
  interfaceExtensionsMap: Record<string, Record<string, boolean>>,
  fieldNodesByType: Record<string, Array<FieldNode>>,
  fieldNodesByField: Record<string, Record<string, Array<FieldNode>>>,
  dynamicSelectionSetsByField: Record<
    string,
    Record<string, Array<(node: FieldNode) => SelectionSetNode>>
  >,
  // TODO: Refactor here later for Federation compat
  infoSchema: GraphQLSchema,
  visitedSelections: WeakMap<SelectionNode, VisitedParents>,
  fragmentMap: Record<string, FragmentDefinitionNode>,
  delegationContext: DelegationContext,
  selectionSatisfactionCache: SelectionSatisfactionCache,
): SelectionSetNode {
  const newSelections = new Set<SelectionNode>();
  const maybeType = typeInfo.getParentType();
  if (maybeType != null) {
    const parentType: GraphQLNamedType = getNamedType(maybeType);
    if (
      isSelectionSetSatisfiedBySchema(
        transformedSchema,
        parentType,
        node,
        fragmentMap,
        infoSchema,
        delegationContext,
        selectionSatisfactionCache,
      )
    ) {
      if (isAbstractType(delegationContext.returnType)) {
        addSelectionNodeToSelections(newSelections, {
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: '__typename',
          },
        });
      }
      for (const selection of node.selections) {
        addSelectionNodeToSelections(newSelections, selection);
      }
      return {
        ...node,
        selections: Array.from(newSelections),
      };
    }
    const parentTypeName = parentType.name;

    const fieldNodes = fieldNodesByType[parentTypeName];
    if (fieldNodes) {
      for (const fieldNode of fieldNodes) {
        addSelectionNodeToSelections(newSelections, fieldNode);
      }
    }

    const interfaceExtensions = interfaceExtensionsMap[parentType.name];
    const interfaceExtensionFields: Array<SelectionNode> = [];

    for (const selection of node.selections) {
      if (selection.kind === Kind.INLINE_FRAGMENT) {
        if (selection.typeCondition != null) {
          // TODO: Refactor here later for Federation compat
          if (markVisitedForParent(visitedSelections, selection, parentTypeName)) {
            const typeName = selection.typeCondition.name.value;
            const getExtraPossibleTypes = getExtraPossibleTypesFn(transformedSchema, infoSchema);
            const extraPossibleTypes = getExtraPossibleTypes(typeName);
            for (const extraPossibleTypeName of extraPossibleTypes) {
              addSelectionNodeToSelections(newSelections, {
                ...selection,
                typeCondition: {
                  kind: Kind.NAMED_TYPE,
                  name: {
                    kind: Kind.NAME,
                    value: extraPossibleTypeName,
                  },
                },
              });
            }
            const typeInSubschema = transformedSchema.getType(typeName);
            if (isObjectType(typeInSubschema) || isInterfaceType(typeInSubschema)) {
              const fieldMap = typeInSubschema.getFields();
              for (const subSelection of selection.selectionSet.selections) {
                if (subSelection.kind === Kind.FIELD) {
                  const fieldName = subSelection.name.value;
                  const field = fieldMap[fieldName];
                  if (!field) {
                    // Lift missing fields inside a wrapper that preserves the
                    // concrete type condition and original directives (@skip…).
                    addSelectionNodeToSelections(newSelections, {
                      kind: Kind.INLINE_FRAGMENT,
                      typeCondition: selection.typeCondition,
                      directives: selection.directives,
                      selectionSet: {
                        kind: Kind.SELECTION_SET,
                        selections: [subSelection],
                      },
                    });
                  }
                }
              }
            } else if (!typeInSubschema) {
              for (const subSelection of selection.selectionSet.selections) {
                addSelectionNodeToSelections(newSelections, {
                  kind: Kind.INLINE_FRAGMENT,
                  typeCondition: selection.typeCondition,
                  directives: selection.directives,
                  selectionSet: {
                    kind: Kind.SELECTION_SET,
                    selections: [subSelection],
                  },
                });
              }
            }
          }

          const possibleTypes = possibleTypesMap[selection.typeCondition.name.value];

          if (possibleTypes == null) {
            const fieldNodesForTypeName = fieldNodesByField[parentTypeName]?.__typename;
            if (fieldNodesForTypeName) {
              for (const fieldNode of fieldNodesForTypeName) {
                addSelectionNodeToSelections(newSelections, fieldNode);
              }
            }
            addSelectionNodeToSelections(newSelections, selection);
            continue;
          }

          for (const possibleTypeName of possibleTypes) {
            const maybePossibleType = transformedSchema.getType(possibleTypeName);
            if (
              maybePossibleType != null &&
              implementsAbstractType(transformedSchema, parentType, maybePossibleType)
            ) {
              addSelectionNodeToSelections(
                newSelections,
                // Preserve directives from the original inline fragment.
                {
                  ...selection,
                  typeCondition: {
                    kind: Kind.NAMED_TYPE,
                    name: {
                      kind: Kind.NAME,
                      value: possibleTypeName,
                    },
                  },
                },
              );
            }
          }

          if (possibleTypes.length === 0) {
            addSelectionNodeToSelections(newSelections, selection);
          }
        } else {
          addSelectionNodeToSelections(newSelections, selection);
        }
      } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
        const fragmentName = selection.name.value;

        if (!fragmentReplacements[fragmentName]) {
          addSelectionNodeToSelections(newSelections, selection);
          continue;
        }

        for (const replacement of fragmentReplacements[fragmentName]) {
          const typeName = replacement.typeName;
          const maybeReplacementType = transformedSchema.getType(typeName);

          if (
            maybeReplacementType != null &&
            implementsAbstractType(transformedSchema, parentType, maybeReplacementType)
          ) {
            // Preserve directives / loc from the original spread; only rename.
            addSelectionNodeToSelections(newSelections, {
              ...selection,
              name: {
                kind: Kind.NAME,
                value: replacement.fragmentName,
              },
            });
          }
        }
      } else {
        const fieldName = selection.name.value;

        if (interfaceExtensions?.[fieldName]) {
          interfaceExtensionFields.push(selection);
        } else {
          addSelectionNodeToSelections(newSelections, selection);
        }

        // TODO: Optimization to prevent extra fields to the subgraph
        if (isAbstractType(parentType)) {
          const fieldNodesForTypeName = fieldNodesByField[parentTypeName]?.__typename;
          if (fieldNodesForTypeName) {
            for (const fieldNode of fieldNodesForTypeName) {
              addSelectionNodeToSelections(newSelections, fieldNode);
            }
          }
        }
        const fieldNodesMapForType = fieldNodesByField[parentTypeName];
        if (fieldNodesMapForType) {
          addDependenciesNestedly(selection, new Set(), fieldNodesMapForType, newSelections);
        }

        const dynamicSelectionSets = dynamicSelectionSetsByField[parentTypeName]?.[fieldName];
        if (dynamicSelectionSets != null) {
          for (const selectionSetFn of dynamicSelectionSets) {
            const selectionSet = selectionSetFn(selection);
            if (selectionSet != null) {
              for (const selection of selectionSet.selections) {
                addSelectionNodeToSelections(newSelections, selection);
              }
            }
          }
        }
      }
    }

    if (reversePossibleTypesMap[parentType.name]) {
      addSelectionNodeToSelections(newSelections, {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: '__typename',
        },
      });
    }

    if (interfaceExtensionFields.length) {
      const possibleTypes = possibleTypesMap[parentType.name];
      if (possibleTypes != null) {
        for (const possibleType of possibleTypes) {
          addSelectionNodeToSelections(
            newSelections,
            generateInlineFragment(possibleType, {
              kind: Kind.SELECTION_SET,
              selections: interfaceExtensionFields,
            }),
          );
        }
      }
    }

    return {
      ...node,
      selections: Array.from(newSelections),
    };
  }

  return node;
}

/**
 * Returns true if this is the first time `selection` is seen under `parentTypeName`.
 * Avoids allocating a Set until a second distinct parent appears.
 */
function markVisitedForParent(
  visitedSelections: WeakMap<SelectionNode, VisitedParents>,
  selection: SelectionNode,
  parentTypeName: string,
): boolean {
  const prev = visitedSelections.get(selection);
  if (prev == null) {
    visitedSelections.set(selection, parentTypeName);
    return true;
  }
  if (typeof prev === 'string') {
    if (prev === parentTypeName) {
      return false;
    }
    visitedSelections.set(selection, new Set([prev, parentTypeName]));
    return true;
  }
  if (prev.has(parentTypeName)) {
    return false;
  }
  prev.add(parentTypeName);
  return true;
}

function valueNodesEqual(a: ValueNode, b: ValueNode): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  switch (a.kind) {
    case Kind.NULL:
      return true;
    case Kind.INT:
    case Kind.FLOAT:
    case Kind.STRING:
    case Kind.BOOLEAN:
    case Kind.ENUM:
      return a.value === (b as typeof a).value;
    case Kind.VARIABLE:
      return a.name.value === (b as typeof a).name.value;
    case Kind.LIST: {
      const bList = b as typeof a;
      if (a.values.length !== bList.values.length) {
        return false;
      }
      for (let i = 0; i < a.values.length; i++) {
        if (!valueNodesEqual(a.values[i]!, bList.values[i]!)) {
          return false;
        }
      }
      return true;
    }
    case Kind.OBJECT: {
      const bObj = b as typeof a;
      if (a.fields.length !== bObj.fields.length) {
        return false;
      }
      // Order-insensitive: match each field by name.
      for (const aField of a.fields) {
        const bField = bObj.fields.find(f => f.name.value === aField.name.value);
        if (bField == null || !valueNodesEqual(aField.value, bField.value)) {
          return false;
        }
      }
      return true;
    }
    default:
      return false;
  }
}

function fieldArgumentsEqual(a: FieldNode, b: FieldNode): boolean {
  const aArgs = a.arguments;
  const bArgs = b.arguments;
  const aLen = aArgs?.length ?? 0;
  const bLen = bArgs?.length ?? 0;
  if (aLen !== bLen) {
    return false;
  }
  if (aLen === 0) {
    return true;
  }
  // Order-insensitive structural compare (no JSON.stringify).
  for (const aArg of aArgs!) {
    const bArg = bArgs!.find(arg => arg.name.value === aArg.name.value);
    if (bArg == null || !valueNodesEqual(aArg.value, bArg.value)) {
      return false;
    }
  }
  return true;
}

function directiveArgsEqual(
  a: readonly ArgumentNode[] | undefined,
  b: readonly ArgumentNode[] | undefined,
): boolean {
  const aLen = a?.length ?? 0;
  const bLen = b?.length ?? 0;
  if (aLen !== bLen) {
    return false;
  }
  if (aLen === 0) {
    return true;
  }
  for (const aArg of a!) {
    const bArg = b!.find(arg => arg.name.value === aArg.name.value);
    if (bArg == null || !valueNodesEqual(aArg.value, bArg.value)) {
      return false;
    }
  }
  return true;
}

function fieldDirectivesCover(existing: FieldNode, incoming: FieldNode): boolean {
  const existingDirs = existing.directives;
  const incomingDirs = incoming.directives;
  const incomingLen = incomingDirs?.length ?? 0;
  const existingLen = existingDirs?.length ?? 0;
  // Unconditional existing covers conditional incoming; conditional existing
  // does not cover unconditional incoming. Identical directive sets cover.
  if (incomingLen === 0) {
    return existingLen === 0;
  }
  if (existingLen === 0) {
    return true;
  }
  if (existingLen !== incomingLen) {
    return false;
  }
  for (const aDir of existingDirs!) {
    const bDir = incomingDirs!.find(d => d.name.value === aDir.name.value);
    if (bDir == null || !directiveArgsEqual(aDir.arguments, bDir.arguments)) {
      return false;
    }
  }
  return true;
}

function isFieldNodeSatisfiedBySelections(
  fieldNode: FieldNode,
  existing: Readonly<Set<SelectionNode>>,
) {
  for (const existingSelection of existing) {
    if (
      existingSelection.kind === Kind.FIELD &&
      existingSelection.name.value === fieldNode.name.value &&
      existingSelection.alias?.value === fieldNode.alias?.value &&
      // Fast path: skip deep compares when both sides have no args/directives.
      ((fieldNode.arguments?.length ?? 0) === 0 && (existingSelection.arguments?.length ?? 0) === 0
        ? true
        : fieldArgumentsEqual(existingSelection, fieldNode)) &&
      ((fieldNode.directives?.length ?? 0) === 0 &&
      (existingSelection.directives?.length ?? 0) === 0
        ? true
        : fieldDirectivesCover(existingSelection, fieldNode))
    ) {
      if (fieldNode.selectionSet && !existingSelection.selectionSet) {
        return false;
      }
      if (fieldNode.selectionSet && existingSelection.selectionSet) {
        const satisfied = isSelectionSetSatisfied({
          incoming: fieldNode.selectionSet,
          existing: existingSelection.selectionSet.selections,
        });
        if (!satisfied) {
          return false;
        }
      }
      return true;
    }
  }
  return false;
}

export function isSelectionSetSatisfiedBySchema(
  schema: GraphQLSchema,
  type: GraphQLNamedType,
  selectionSet: SelectionSetNode,
  fragmentsMap: Record<string, FragmentDefinitionNode>,
  infoSchema: GraphQLSchema,
  delegationContext: DelegationContext,
  cache?: SelectionSatisfactionCache,
) {
  let byType = cache?.get(selectionSet);
  if (byType?.has(type.name)) {
    return byType.get(type.name)!;
  }
  const result = isSelectionSetSatisfiedBySchemaImpl(
    schema,
    type,
    selectionSet,
    fragmentsMap,
    infoSchema,
    delegationContext,
    cache,
  );
  if (cache != null) {
    if (byType == null) {
      byType = new Map();
      cache.set(selectionSet, byType);
    }
    byType.set(type.name, result);
  }
  return result;
}

function isSelectionSetSatisfiedBySchemaImpl(
  schema: GraphQLSchema,
  type: GraphQLNamedType,
  selectionSet: SelectionSetNode,
  fragmentsMap: Record<string, FragmentDefinitionNode>,
  infoSchema: GraphQLSchema,
  delegationContext: DelegationContext,
  cache?: SelectionSatisfactionCache,
) {
  const namedType = getNamedType(type);
  if (isLeafType(namedType)) {
    return true;
  }
  const fields =
    isObjectType(namedType) || isInterfaceType(namedType) ? namedType.getFields() : null;
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      if (isAbstractType(namedType)) {
        return false;
      }
      const fieldName = selection.name.value;
      if (fieldName === '__typename') {
        continue;
      }
      if (fields) {
        const field = fields[fieldName];
        if (!field) {
          return false;
        }
        const typeInInfoSchema = infoSchema.getType(namedType.name) as
          GraphQLObjectType | GraphQLInterfaceType;
        const fieldInInfoSchema = typeInInfoSchema?.getFields?.()?.[fieldName];
        const resolverInInfoSchema = fieldInInfoSchema?.resolve;
        // Is additional field?
        if (
          resolverInInfoSchema != null &&
          resolverInInfoSchema.name !== 'defaultMergedResolver' &&
          resolverInInfoSchema.name !== 'defaultFieldResolver'
        ) {
          return false;
        }
        if (delegationContext.info) {
          const overrideHandler =
            delegationContext.subschemaConfig?.merge?.[namedType.name]?.fields?.[field.name]
              ?.override;
          if (overrideHandler != null) {
            const overridden = handleOverrideByDelegation(
              delegationContext.info,
              delegationContext.context,
              overrideHandler,
            );
            if (!overridden) {
              return false;
            }
          }
        }
        if (selection.selectionSet) {
          const fieldType = getNamedType(field.type);
          const satisfied = isSelectionSetSatisfiedBySchema(
            schema,
            fieldType,
            selection.selectionSet,
            fragmentsMap,
            infoSchema,
            delegationContext,
            cache,
          );
          if (!satisfied) {
            return false;
          }
        }
      } else {
        return false;
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      if (selection.typeCondition) {
        const typeConditionName = selection.typeCondition.name.value;
        const typeCondition = schema.getType(typeConditionName);
        if (!typeCondition) {
          return false;
        }
        const satisfied = isSelectionSetSatisfiedBySchema(
          schema,
          typeCondition,
          selection.selectionSet,
          fragmentsMap,
          infoSchema,
          delegationContext,
          cache,
        );
        if (!satisfied) {
          return false;
        }
      } else {
        const satisfied = isSelectionSetSatisfiedBySchema(
          schema,
          type,
          selection.selectionSet,
          fragmentsMap,
          infoSchema,
          delegationContext,
          cache,
        );
        if (!satisfied) {
          return false;
        }
      }
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const fragmentName = selection.name.value;
      const fragment = fragmentsMap[fragmentName];
      if (!fragment) {
        return false;
      }
      const typeConditionName = fragment.typeCondition.name.value;
      const typeCondition = schema.getType(typeConditionName);
      if (!typeCondition) {
        return false;
      }
      const satisfied = isSelectionSetSatisfiedBySchema(
        schema,
        typeCondition,
        fragment.selectionSet,
        fragmentsMap,
        infoSchema,
        delegationContext,
        cache,
      );
      if (!satisfied) {
        return false;
      }
    }
  }
  return true;
}

function isSelectionSetSatisfied({
  incoming,
  existing,
}: {
  incoming: SelectionSetNode;
  existing: readonly SelectionNode[];
}) {
  for (const incomingSelection of incoming.selections) {
    if (incomingSelection.kind === Kind.FIELD) {
      const existingField = existing.find(selection => {
        return (
          selection.kind === Kind.FIELD &&
          selection.name.value === incomingSelection.name.value &&
          selection.alias?.value === incomingSelection.alias?.value &&
          ((incomingSelection.arguments?.length ?? 0) === 0 &&
          (selection.arguments?.length ?? 0) === 0
            ? true
            : fieldArgumentsEqual(selection, incomingSelection)) &&
          ((incomingSelection.directives?.length ?? 0) === 0 &&
          (selection.directives?.length ?? 0) === 0
            ? true
            : fieldDirectivesCover(selection, incomingSelection))
        );
      }) as FieldNode | undefined;
      if (!existingField) {
        return false;
      }
      if (incomingSelection.selectionSet && !existingField.selectionSet) {
        return false;
      }
      if (incomingSelection.selectionSet && existingField.selectionSet) {
        const satisfied = isSelectionSetSatisfied({
          incoming: incomingSelection.selectionSet,
          existing: existingField.selectionSet.selections,
        });
        if (!satisfied) {
          return false;
        }
      }
    } else {
      return false;
    }
  }
  return true;
}

function responseKeyOf(field: FieldNode): string {
  return field.alias?.value ?? field.name.value;
}

function addSelectionNodeToSelections(
  selections: Set<SelectionNode>,
  selectionNode: SelectionNode,
) {
  if (
    selectionNode.kind === Kind.FIELD &&
    isFieldNodeSatisfiedBySelections(selectionNode, selections)
  ) {
    return;
  }
  if (selectionNode.kind === Kind.FIELD) {
    // Different arguments sharing a response key need a distinct alias.
    // Skip the scan when the incoming field has no arguments and no existing
    // same-key field has arguments (common federation path).
    const incomingArgsLen = selectionNode.arguments?.length ?? 0;
    if (incomingArgsLen > 0 || selections.size > 0) {
      const key = responseKeyOf(selectionNode);
      let conflict = false;
      for (const existing of selections) {
        if (existing.kind === Kind.FIELD && responseKeyOf(existing) === key) {
          if (incomingArgsLen === 0) {
            if ((existing.arguments?.length ?? 0) > 0) {
              conflict = true;
              break;
            }
          } else if (!fieldArgumentsEqual(existing, selectionNode)) {
            conflict = true;
            break;
          }
        }
      }
      if (conflict) {
        const aliased: FieldNode = {
          ...selectionNode,
          alias: {
            kind: Kind.NAME,
            value: `_stitch_${selectionNode.name.value}_${selections.size}`,
          },
        };
        selections.add(aliased);
        return;
      }
    }
  }
  selections.add(selectionNode);
}

function addDependenciesNestedly(
  fieldNode: FieldNode,
  seenFieldNames: Set<string>,
  fieldNodesByField: Record<string, Array<FieldNode>>,
  newSelections: Set<SelectionNode>,
) {
  if (seenFieldNames.has(fieldNode.name.value)) {
    return;
  }
  seenFieldNames.add(fieldNode.name.value);
  const fieldNodes = fieldNodesByField[fieldNode.name.value];
  if (fieldNodes != null) {
    for (const nestedFieldNode of fieldNodes) {
      addSelectionNodeToSelections(newSelections, nestedFieldNode);
      addDependenciesNestedly(nestedFieldNode, seenFieldNames, fieldNodesByField, newSelections);
    }
  }
}

function generateInlineFragment(
  typeName: string,
  selectionSet: SelectionSetNode,
): InlineFragmentNode {
  return {
    kind: Kind.INLINE_FRAGMENT,
    typeCondition: {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: typeName,
      },
    },
    selectionSet,
  };
}

const getSchemaMetaData = memoize2(
  (
    sourceSchema: GraphQLSchema,
    targetSchema: GraphQLSchema,
  ): {
    possibleTypesMap: Record<string, Array<string>>;
    reversePossibleTypesMap: Record<string, Array<string>>;
    interfaceExtensionsMap: Record<string, Record<string, boolean>>;
    fieldNodesByType: Record<string, Array<FieldNode>>;
    fieldNodesByField: Record<string, Record<string, Array<FieldNode>>>;
    dynamicSelectionSetsByField: Record<
      string,
      Record<string, Array<(node: FieldNode) => SelectionSetNode>>
    >;
  } => {
    const typeMap = sourceSchema.getTypeMap();
    const targetTypeMap = targetSchema.getTypeMap();
    const possibleTypesMap: Record<string, Array<string>> = Object.create(null);
    const interfaceExtensionsMap: Record<string, Record<string, boolean>> = Object.create(null);

    for (const typeName in typeMap) {
      const type = typeMap[typeName];

      if (isAbstractType(type)) {
        const targetType = targetTypeMap[typeName];

        if (isInterfaceType(type) && isInterfaceType(targetType)) {
          const targetTypeFields = targetType.getFields();
          const sourceTypeFields = type.getFields();
          const extensionFields: Record<string, boolean> = Object.create(null);
          let isExtensionFieldsEmpty = true;

          for (const fieldName in sourceTypeFields) {
            if (!targetTypeFields[fieldName]) {
              extensionFields[fieldName] = true;
              isExtensionFieldsEmpty = false;
            }
          }

          if (!isExtensionFieldsEmpty) {
            interfaceExtensionsMap[typeName] = extensionFields;
          }
        }

        if (interfaceExtensionsMap[typeName] || !isAbstractType(targetType)) {
          const implementations = sourceSchema.getPossibleTypes(type);
          possibleTypesMap[typeName] = [];

          for (const impl of implementations) {
            if (targetTypeMap[impl.name]) {
              possibleTypesMap[typeName].push(impl.name);
            }
          }
        }
      }
    }

    const stitchingInfo = sourceSchema.extensions?.stitchingInfo as StitchingInfo;
    // Null-prototype fallbacks so missing metadata cannot expose inherited keys
    // like `constructor` as iterable field-node lists.
    return {
      possibleTypesMap,
      reversePossibleTypesMap: reversePossibleTypesMap(possibleTypesMap),
      interfaceExtensionsMap,
      fieldNodesByType: stitchingInfo?.fieldNodesByType ?? Object.create(null),
      fieldNodesByField: stitchingInfo?.fieldNodesByField ?? Object.create(null),
      dynamicSelectionSetsByField:
        stitchingInfo?.dynamicSelectionSetsByField ?? Object.create(null),
    };
  },
);

function reversePossibleTypesMap(
  possibleTypesMap: Record<string, Array<string>>,
): Record<string, Array<string>> {
  const result: Record<string, Array<string>> = Object.create(null);
  for (const typeName in possibleTypesMap) {
    const toTypeNames = possibleTypesMap[typeName];
    if (toTypeNames) {
      for (const toTypeName of toTypeNames) {
        if (!result[toTypeName]) {
          result[toTypeName] = [];
        }
        result[toTypeName].push(typeName);
      }
    }
  }
  return result;
}

function getExpandedFragments(
  fragments: Array<FragmentDefinitionNode>,
  fragmentNames: Set<string>,
  possibleTypesMap: Record<string, Array<string>>,
): {
  expandedFragments: Array<FragmentDefinitionNode>;
  fragmentReplacements: Record<string, Array<{ fragmentName: string; typeName: string }>>;
} {
  let fragmentCounter = 0;
  function generateFragmentName(typeName: string): string {
    let fragmentName: string;

    do {
      fragmentName = `_${typeName}_Fragment${fragmentCounter.toString()}`;
      fragmentCounter++;
    } while (fragmentNames.has(fragmentName));

    return fragmentName;
  }

  const expandedFragments: Array<FragmentDefinitionNode> = [];
  const fragmentReplacements: Record<
    string,
    Array<{ fragmentName: string; typeName: string }>
  > = Object.create(null);
  for (const fragment of fragments) {
    const possibleTypes = possibleTypesMap[fragment.typeCondition.name.value];

    if (possibleTypes != null) {
      const fragmentName = fragment.name.value;
      fragmentReplacements[fragmentName] = [];
      for (const possibleTypeName of possibleTypes) {
        const name = generateFragmentName(possibleTypeName);
        fragmentNames.add(name);

        expandedFragments.push({
          kind: Kind.FRAGMENT_DEFINITION,
          name: {
            kind: Kind.NAME,
            value: name,
          },
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: possibleTypeName,
            },
          },
          selectionSet: fragment.selectionSet,
        });

        fragmentReplacements[fragmentName].push({
          fragmentName: name,
          typeName: possibleTypeName,
        });
      }
    }
  }

  return {
    expandedFragments,
    fragmentReplacements,
  };
}

function wrapConcreteTypes(
  returnType: GraphQLOutputType,
  targetSchema: GraphQLSchema,
  document: DocumentNode,
): DocumentNode {
  const namedType = getNamedType(returnType);

  if (isLeafType(namedType)) {
    return document;
  }

  let possibleTypes: readonly GraphQLNamedOutputType[] = isAbstractType(namedType)
    ? targetSchema.getPossibleTypes(namedType)
    : [namedType];

  if (possibleTypes.length === 0) {
    possibleTypes = [namedType];
  }

  const rootTypeNames = getRootTypeNames(targetSchema);

  const typeInfo = getTypeInfo(targetSchema);

  const visitorKeys: ASTVisitorKeyMap = {
    Document: ['definitions'],
    OperationDefinition: ['selectionSet'],
    SelectionSet: ['selections'],

    InlineFragment: ['selectionSet'],
    FragmentDefinition: ['selectionSet'],
  };

  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.FRAGMENT_DEFINITION]: (node: FragmentDefinitionNode) => {
        const typeName = node.typeCondition.name.value;
        if (!rootTypeNames.has(typeName)) {
          return false;
        }
        return undefined;
      },
      [Kind.FIELD]: (node: FieldNode) => {
        const fieldType = typeInfo.getType();
        if (fieldType) {
          const fieldNamedType = getNamedType(fieldType);
          if (
            isAbstractType(fieldNamedType) &&
            fieldNamedType.name !== namedType.name &&
            possibleTypes.length > 0
          ) {
            return {
              ...node,
              selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: possibleTypes.map(possibleType => ({
                  kind: Kind.INLINE_FRAGMENT,
                  typeCondition: {
                    kind: Kind.NAMED_TYPE,
                    name: {
                      kind: Kind.NAME,
                      value: possibleType.name,
                    },
                  },
                  selectionSet: node.selectionSet,
                })),
              },
            };
          }
        }
        return undefined;
      },
    }),
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    visitorKeys as any,
  );
}
