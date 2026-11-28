import {
  getNamedType,
  isAbstractType,
  isInterfaceType,
  isObjectType,
  Kind,
  TypeNameMetaFieldDef,
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLCompositeType,
  type GraphQLField,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import {
  extractUnavailableFields,
  getVariableValues,
  handleOverrideByDelegation,
  subtractSelectionSets,
  type StitchingInfo,
  type Subschema,
} from '@graphql-tools/delegate';
import { collectSubFields, memoize3 } from '@graphql-tools/utils';

export function getFieldsNotInSubschema(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  gatewayType: GraphQLCompositeType,
  subschemaType: GraphQLCompositeType,
  fieldNodes: FieldNode[],
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  subschema: Subschema,
  providedSelectionNode: SelectionSetNode | undefined,
  context: any | undefined,
  info: GraphQLResolveInfo | undefined,
): Array<FieldNode> {
  const sourceSchema = subschema.transformedSchema;
  const normalizedVariableValues = getVariableValues(variableValues);
  // collectSubFields is typed for object parents; for unions/interfaces the
  // abstract branch below expands possible object types.
  let { fields: subFieldNodesByResponseKey } = collectSubFields(
    schema,
    fragments,
    normalizedVariableValues,
    gatewayType as GraphQLObjectType,
    fieldNodes,
  );

  let mapChanged = false;

  // Collect deferred fields
  // delegate them when their resolver runs so the parent can be released

  const fieldsNotInSchema = new Set<FieldNode>();
  if (isAbstractType(gatewayType)) {
    fieldsNotInSchema.add({
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: '__typename',
      },
    });
    for (const possibleType of schema.getPossibleTypes(gatewayType)) {
      const { fields: subFieldNodesOfPossibleType } = collectSubFields(
        schema,
        fragments,
        normalizedVariableValues,
        possibleType,
        fieldNodes,
      );

      for (const [responseKey, subFieldNodes] of subFieldNodesOfPossibleType) {
        if (!mapChanged) {
          subFieldNodesByResponseKey = new Map(subFieldNodesByResponseKey);
          mapChanged = true;
        }
        const existingSubFieldNodes = subFieldNodesByResponseKey.get(responseKey);
        if (existingSubFieldNodes) {
          existingSubFieldNodes.push(...subFieldNodes);
        } else {
          subFieldNodesByResponseKey.set(responseKey, subFieldNodes);
        }
      }
    }
  }

  // TODO: Verify whether it is safe that extensions always exists.
  const fieldNodesByField = stitchingInfo?.fieldNodesByField;

  // Unions have no fields of their own; treat every selected field as absent
  // so the abstract-type path in the delegation planner can re-fetch via
  // inline fragments on the owning subschema (graphql-tools#4966).
  const fields =
    isObjectType(subschemaType) || isInterfaceType(subschemaType)
      ? subschemaType.getFields()
      : Object.create(null);

  const fieldNodesByFieldForType = fieldNodesByField?.[gatewayType.name];

  const providedPaths = providedSelectionNode
    ? collectProvidedSelectionPaths(providedSelectionNode, gatewayType as GraphQLObjectType, schema)
    : null;
  for (const [, subFieldNodes] of subFieldNodesByResponseKey) {
    // Evaluate each node against its own field definition / concrete type.
    // Do not let the first node's definition decide availability for the key.
    for (const subFieldNode of subFieldNodes) {
      const fieldName = subFieldNode.name.value;
      let fieldNotInSchema = false;
      // Availability must use the *subschema* type map only (Hive parity). Looking
      // up possible types on the gateway schema incorrectly treats @interfaceObject
      // fields (Location.plain) as present on every owner that defines Location.
      let field =
        fieldName === '__typename'
          ? TypeNameMetaFieldDef
          : resolveFieldDefForNode(subFieldNode, fields, gatewayType, subschemaType, sourceSchema);
      if (context != null && info != null) {
        const overrideHandler = subschema?.merge?.[gatewayType.name]?.fields?.[fieldName]?.override;
        if (overrideHandler != null) {
          const overridden = handleOverrideByDelegation(info, context, overrideHandler);
          if (!overridden) {
            field = undefined;
          }
        }
      }
      if (!field) {
        if (providedSelectionNode) {
          const subFieldSelection: SelectionSetNode = {
            kind: Kind.SELECTION_SET,
            selections: [subFieldNode],
          };
          const flattenedProvided = flattenSelectionsForType(
            providedSelectionNode,
            gatewayType as GraphQLObjectType,
            schema,
          );
          const subtracted = subtractSelectionSets(subFieldSelection, flattenedProvided, fragments);
          if (subtracted?.selections?.length) {
            fieldNotInSchema = true;
            for (const missing of subtracted.selections) {
              fieldsNotInSchema.add(missing as FieldNode);
            }
          }
        } else {
          fieldNotInSchema = true;
          fieldsNotInSchema.add(subFieldNode);
        }
      } else if (
        typeof globalThis === 'undefined' ||
        !(globalThis as any)
          .__DO_NOT_USE__stitching_disable_extract_unavailable_fields_for_fields_not_in_schema__
      ) {
        const rootPath = fieldName;
        const unavailableFields = extractUnavailableFields(
          sourceSchema,
          field,
          subFieldNode,
          (fieldType, selection) => {
            const nestedMerged = stitchingInfo.mergedTypes[fieldType.name];
            if (
              nestedMerged?.resolvers.get(subschema) &&
              mergedTypeHasOwnerForField(nestedMerged, fieldType.name, selection.name.value)
            ) {
              return false;
            }
            // Path-aware @provides: billing.zip must not cover shipping.zip.
            const providedPath = `${rootPath}.${selection.name.value}`;
            if (
              providedPaths?.has(providedPath) ||
              providedPaths?.has(`${rootPath}.${fieldType.name}.${selection.name.value}`)
            ) {
              return false;
            }
            return true;
          },
          fragments,
        );
        if (unavailableFields.length) {
          fieldNotInSchema = true;
          fieldsNotInSchema.add({
            ...subFieldNode,
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: unavailableFields,
            },
          });
        }
      }
      const isComputedField = subschema.merge?.[gatewayType.name]?.fields?.[fieldName]?.computed;
      if ((isComputedField || fieldNotInSchema) && fieldNodesByFieldForType) {
        let addedThisNode = false;
        const visitedFieldNames = new Set<string>();
        addMissingRequiredFields({
          fieldName,
          fields,
          fieldsNotInSchema,
          visitedFieldNames,
          onAdd: () => {
            if (!addedThisNode) {
              fieldsNotInSchema.add(subFieldNode);
              addedThisNode = true;
            }
          },
          fieldNodesByField: fieldNodesByFieldForType,
        });
      }
    }
  }
  return Array.from(fieldsNotInSchema);
}

/**
 * True when at least one merge-target subschema for `typeName` defines
 * `fieldName` on that type. Used so nested selections are not assumed to be
 * type-mergeable when only the parent object key path can reach them.
 */
function mergedTypeHasOwnerForField(
  mergedTypeInfo: StitchingInfo['mergedTypes'][string],
  typeName: string,
  fieldName: string,
): boolean {
  for (const [targetSubschema] of mergedTypeInfo.resolvers) {
    const schema = targetSubschema.transformedSchema;
    const type = schema?.getType(typeName);
    if ((isObjectType(type) || isInterfaceType(type)) && type.getFields()[fieldName] != null) {
      return true;
    }
  }
  return false;
}

function addMissingRequiredFields({
  fieldName,
  fields,
  fieldsNotInSchema,
  onAdd,
  fieldNodesByField,
  visitedFieldNames,
}: {
  fieldName: string;
  fields: Record<string, GraphQLField<any, any>>;
  fieldsNotInSchema: Set<FieldNode>;
  onAdd: VoidFunction;
  fieldNodesByField: Record<string, FieldNode[]>;
  visitedFieldNames: Set<string>;
}) {
  if (visitedFieldNames.has(fieldName)) {
    return;
  }
  visitedFieldNames.add(fieldName);
  const fieldNodesForField = fieldNodesByField?.[fieldName];
  if (fieldNodesForField) {
    for (const fieldNode of fieldNodesForField) {
      if (fieldNode.name.value !== '__typename' && !fields[fieldNode.name.value]) {
        onAdd();
        fieldsNotInSchema.add(fieldNode);
        addMissingRequiredFields({
          fieldName: fieldNode.name.value,
          fields,
          fieldsNotInSchema,
          onAdd,
          fieldNodesByField,
          visitedFieldNames,
        });
      }
    }
  }
}

/**
 * Resolve the field definition for one collected field node on the *subschema*.
 * When the parent is abstract, only consult that subschema's concrete types —
 * never the gateway schema (gateway interfaces absorb @interfaceObject fields
 * that are not actually fetchable here).
 */
function resolveFieldDefForNode(
  fieldNode: FieldNode,
  fields: Record<string, GraphQLField<any, any>>,
  _gatewayType: GraphQLCompositeType,
  subschemaType: GraphQLCompositeType,
  subschemaSchema: GraphQLSchema,
): GraphQLField<any, any> | undefined {
  const fieldName = fieldNode.name.value;
  if (fieldName === '__typename') {
    return TypeNameMetaFieldDef;
  }
  const direct = fields[fieldName];
  if (direct) {
    return direct;
  }
  if (isAbstractType(subschemaType)) {
    // Prefer possibles from the same schema that owns subschemaType.
    const possibles =
      subschemaSchema.getType(subschemaType.name) != null &&
      isAbstractType(subschemaSchema.getType(subschemaType.name)!)
        ? subschemaSchema.getPossibleTypes(
            subschemaSchema.getType(subschemaType.name) as typeof subschemaType,
          )
        : [];
    for (const possible of possibles) {
      const field = possible.getFields()[fieldName];
      if (field) {
        return field;
      }
    }
  }
  return undefined;
}

// Walks the @provides selection set and records selection paths (e.g.
// `billing.zip`) plus path-qualified type.field keys so coverage is scoped to
// the provided branch, not every object of that nested type.
function collectProvidedSelectionPaths(
  selectionSet: SelectionSetNode,
  parentType: GraphQLObjectType,
  schema: GraphQLSchema,
  pathPrefix = '',
): Set<string> {
  const pairs = new Set<string>();
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      const fieldPath = pathPrefix ? `${pathPrefix}.${sel.name.value}` : sel.name.value;
      pairs.add(fieldPath);
      pairs.add(`${fieldPath}@${parentType.name}.${sel.name.value}`);
      if (pathPrefix) {
        pairs.add(`${pathPrefix}.${parentType.name}.${sel.name.value}`);
      }
      if (sel.selectionSet) {
        const fieldDef = parentType.getFields()[sel.name.value];
        if (fieldDef) {
          const namedType = getNamedType(fieldDef.type);
          if (isObjectType(namedType)) {
            for (const p of collectProvidedSelectionPaths(
              sel.selectionSet,
              namedType,
              schema,
              fieldPath,
            )) {
              pairs.add(p);
            }
          }
        }
      }
    } else if (sel.kind === Kind.INLINE_FRAGMENT && sel.selectionSet) {
      const condType = sel.typeCondition
        ? (schema.getType(sel.typeCondition.name.value) as GraphQLObjectType | null)
        : parentType;
      if (condType && isObjectType(condType)) {
        for (const p of collectProvidedSelectionPaths(
          sel.selectionSet,
          condType,
          schema,
          pathPrefix,
        )) {
          pairs.add(p);
        }
      }
    }
  }
  return pairs;
}

// Flatten inline fragments (and matching fragment spreads) inside a
// `@provides` selection set so that field-level subtraction can recognise
// fields that were declared inside `... on TypeName { ... }`.
//
// The result is type-specific: when the planner is evaluating fields for a
// concrete `gatewayType`, only inline fragments whose type condition is
// compatible with that type are lifted up. Other inline fragments are
// preserved as-is so that the same provided selection set can still be used
// for other concrete types that go through the same merged-type resolver.
const flattenSelectionsForTypeImpl = (
  selectionSet: SelectionSetNode,
  gatewayType: GraphQLObjectType,
  schema: GraphQLSchema,
): SelectionSetNode => {
  let changed = false;
  const flat: SelectionNode[] = [];
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      const condName = selection.typeCondition?.name.value;
      const condType = condName ? schema.getType(condName) : gatewayType;
      const matchesGatewayType =
        condType != null &&
        (condType.name === gatewayType.name ||
          (isAbstractType(condType) && schema.isSubType(condType, gatewayType)));
      if (matchesGatewayType) {
        changed = true;
        const inner = flattenSelectionsForType(selection.selectionSet, gatewayType, schema);
        for (const innerSel of inner.selections) {
          flat.push(innerSel);
        }
        continue;
      }
    }
    flat.push(selection);
  }
  if (!changed) {
    return selectionSet;
  }
  return {
    kind: Kind.SELECTION_SET,
    selections: flat,
  };
};

const flattenSelectionsForType = memoize3(flattenSelectionsForTypeImpl);
