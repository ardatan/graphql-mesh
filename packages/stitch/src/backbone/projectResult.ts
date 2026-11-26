import type {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
} from 'graphql';
import {
  getNamedType,
  isAbstractType,
  isLeafType,
  isNonNullType,
  isObjectType,
  Kind,
} from 'graphql';
import { getVariableValues } from '@graphql-tools/delegate';
import { collectFields, getDefinedRootType } from '@graphql-tools/utils';

/**
 * Project execution data down to the client operation selection set.
 * Drops planning-only fields such as unrequested `__typename`.
 */
export function projectDataToOperation(
  schema: GraphQLSchema,
  operation: OperationDefinitionNode,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  data: Record<string, any> | null | undefined,
): Record<string, any> | null | undefined {
  if (data == null) {
    return data;
  }
  const rootType = getDefinedRootType(schema, operation.operation);
  const { fields } = collectFields(
    schema,
    fragments,
    getVariableValues(variableValues),
    rootType,
    operation.selectionSet,
  );
  const projected: Record<string, any> = {};
  for (const [responseKey, fieldNodes] of fields) {
    if (!(responseKey in data)) {
      continue;
    }
    const fieldNode = fieldNodes[0]!;
    const field = rootType.getFields()[fieldNode.name.value];
    projected[responseKey] = projectValue(
      schema,
      fragments,
      variableValues,
      field ? getNamedType(field.type) : undefined,
      fieldNodes,
      data[responseKey],
    );
  }
  return projected;
}

function projectValue(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  runtimeType: GraphQLNamedType | undefined,
  fieldNodes: FieldNode[],
  value: any,
): any {
  if (value == null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item =>
      projectValue(schema, fragments, variableValues, runtimeType, fieldNodes, item),
    );
  }
  // Leaf scalars first — Date/Buffer/etc. are typeof 'object' but must serialize
  // (otherwise `{...date}` becomes `{}` and odata DateTime fields go empty).
  if (runtimeType && isLeafType(runtimeType)) {
    try {
      return runtimeType.serialize(value);
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object') {
    return value;
  }

  let objectType: GraphQLObjectType | undefined;
  if (isObjectType(runtimeType)) {
    objectType = runtimeType;
  } else if (isAbstractType(runtimeType) && typeof value.__typename === 'string') {
    const t = schema.getType(value.__typename);
    if (isObjectType(t)) {
      objectType = t;
    } else if (t == null) {
      // Concrete type removed from the API schema (@inaccessible) - null the
      // abstract field value (e.g. Foo resolving to inaccessible Baz).
      return null;
    }
    // else: __typename is still an interface (@interfaceObject) - project
    // via projectInterfaceObjectValue below.
  } else if (typeof value.__typename === 'string') {
    const t = schema.getType(value.__typename);
    if (isObjectType(t)) {
      objectType = t;
    }
  }

  const selectionSet: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: fieldNodes.flatMap(fieldNode => fieldNode.selectionSet?.selections ?? []),
  };
  if (!selectionSet.selections.length) {
    // Leaf field - return scalar/object as-is without __typename injection noise
    const { __typename: _t, ...rest } = value as Record<string, any>;
    return Object.keys(rest).length ? rest : value;
  }

  // @interfaceObject responses may keep the interface name as __typename
  // (NodeWithName / Account). Project interface fields directly and only apply
  // concrete fragments when a real object __typename is present.
  if (!objectType && isAbstractType(runtimeType)) {
    return projectInterfaceObjectValue(
      schema,
      fragments,
      variableValues,
      runtimeType,
      selectionSet,
      value,
    );
  }
  if (!objectType) {
    const { __typename: _t, ...rest } = value as Record<string, any>;
    return rest;
  }

  const { fields } = collectFields(
    schema,
    fragments,
    getVariableValues(variableValues),
    objectType,
    selectionSet,
  );
  const projected: Record<string, any> = {};
  for (const [responseKey, nestedFieldNodes] of fields) {
    const nestedFieldNode = nestedFieldNodes[0]!;
    if (nestedFieldNode.name.value === '__typename') {
      projected[responseKey] = value[responseKey] ?? value.__typename ?? objectType.name;
      continue;
    }
    const field = objectType.getFields()[nestedFieldNode.name.value];
    if (!(responseKey in value) && !(nestedFieldNode.name.value in value)) {
      // GraphQL completion: unresolved nullable fields become null (e.g.
      // Book.author when the id-key hop returned null for that entity).
      if (field && !isNonNullType(field.type)) {
        projected[responseKey] = null;
      }
      continue;
    }
    const raw = responseKey in value ? value[responseKey] : value[nestedFieldNode.name.value];
    projected[responseKey] = projectValue(
      schema,
      fragments,
      variableValues,
      field ? getNamedType(field.type) : undefined,
      nestedFieldNodes,
      raw,
    );
  }
  return projected;
}

/**
 * Project a value whose runtime __typename is still an interface (federation
 * @interfaceObject). Include interface fields; skip concrete-typed fragments
 * unless the value carries a matching concrete __typename.
 */
function projectInterfaceObjectValue(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  abstractType: NonNullable<ReturnType<typeof getNamedType>>,
  selectionSet: SelectionSetNode,
  value: Record<string, any>,
): Record<string, any> {
  const projected: Record<string, any> = {};
  const abstractFields =
    isAbstractType(abstractType) && 'getFields' in abstractType
      ? (abstractType as any).getFields()
      : {};

  const applyField = (fieldNode: FieldNode) => {
    const responseKey = fieldNode.alias?.value ?? fieldNode.name.value;
    if (fieldNode.name.value === '__typename') {
      projected[responseKey] = value.__typename ?? abstractType.name;
      return;
    }
    if (!(responseKey in value) && !(fieldNode.name.value in value)) {
      return;
    }
    const field = abstractFields[fieldNode.name.value];
    const raw = responseKey in value ? value[responseKey] : value[fieldNode.name.value];
    projected[responseKey] = projectValue(
      schema,
      fragments,
      variableValues,
      field?.type != null ? getNamedType(field.type as GraphQLOutputType) : undefined,
      [fieldNode],
      raw,
    );
  };

  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      applyField(sel);
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      const cond = sel.typeCondition?.name.value;
      if (!cond || cond === abstractType.name) {
        for (const nested of sel.selectionSet.selections) {
          if (nested.kind === Kind.FIELD) {
            applyField(nested);
          }
        }
      } else if (value.__typename === cond) {
        for (const nested of sel.selectionSet.selections) {
          if (nested.kind === Kind.FIELD) {
            applyField(nested);
          }
        }
      } else if (!value.__typename && cond) {
        // Subgraph omitted __typename; still project concrete-fragment fields
        // that are present on the value (union intersection / provides cases).
        const concrete = schema.getType(cond);
        if (
          isObjectType(concrete) &&
          isAbstractType(abstractType) &&
          schema.isSubType(abstractType, concrete)
        ) {
          for (const nested of sel.selectionSet.selections) {
            if (nested.kind !== Kind.FIELD) {
              continue;
            }
            const key = nested.alias?.value ?? nested.name.value;
            if (key in value || nested.name.value in value) {
              applyField(nested);
            }
          }
        }
      }
      // Concrete fragment with interface-object __typename: omit (no match).
    } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const fragment = fragments[sel.name.value];
      if (!fragment) {
        continue;
      }
      const cond = fragment.typeCondition.name.value;
      if (cond === abstractType.name || value.__typename === cond) {
        for (const nested of fragment.selectionSet.selections) {
          if (nested.kind === Kind.FIELD) {
            applyField(nested);
          }
        }
      } else if (!value.__typename) {
        const concrete = schema.getType(cond);
        if (
          isObjectType(concrete) &&
          isAbstractType(abstractType) &&
          schema.isSubType(abstractType, concrete)
        ) {
          for (const nested of fragment.selectionSet.selections) {
            if (nested.kind !== Kind.FIELD) {
              continue;
            }
            const key = nested.alias?.value ?? nested.name.value;
            if (key in value || nested.name.value in value) {
              applyField(nested);
            }
          }
        }
      }
    }
  }
  return projected;
}

/** @internal test helper */
export function selectionHasAbstractTypes(
  schema: GraphQLSchema,
  selectionSet: SelectionSetNode,
  parentType: GraphQLObjectType,
  fragments: Record<string, FragmentDefinitionNode>,
  seen = new Set<string>(),
): boolean {
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      if (!selection.selectionSet) {
        continue;
      }
      const field = parentType.getFields()[selection.name.value];
      if (!field) {
        continue;
      }
      const named = getNamedType(field.type);
      if (isAbstractType(named)) {
        return true;
      }
      if (isObjectType(named)) {
        const key = `${named.name}:${selection.name.value}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        if (selectionHasAbstractTypes(schema, selection.selectionSet, named, fragments, seen)) {
          return true;
        }
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      const typeName = selection.typeCondition?.name.value;
      if (typeName) {
        const t = schema.getType(typeName);
        if (isAbstractType(t)) {
          return true;
        }
        if (
          isObjectType(t) &&
          selectionHasAbstractTypes(schema, selection.selectionSet, t, fragments, seen)
        ) {
          return true;
        }
      } else if (
        selectionHasAbstractTypes(schema, selection.selectionSet, parentType, fragments, seen)
      ) {
        return true;
      }
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const fragment = fragments[selection.name.value];
      if (!fragment) {
        continue;
      }
      const t = schema.getType(fragment.typeCondition.name.value);
      if (isAbstractType(t)) {
        return true;
      }
      if (
        isObjectType(t) &&
        selectionHasAbstractTypes(schema, fragment.selectionSet, t, fragments, seen)
      ) {
        return true;
      }
    }
  }
  return false;
}

void (null as unknown as SelectionNode);
