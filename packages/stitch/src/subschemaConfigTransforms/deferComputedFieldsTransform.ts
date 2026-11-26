import {
  getNamedType,
  isInterfaceType,
  isObjectType,
  Kind,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  type DocumentNode,
  type FieldNode,
  type GraphQLSchema,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import {
  getVariableValues,
  type DelegationContext,
  type SubschemaConfig,
  type Transform,
} from '@graphql-tools/delegate';
import { collectFields, parseSelectionSet, type ExecutionRequest } from '@graphql-tools/utils';

function hasConditionalDirectives(field: FieldNode): boolean {
  return (
    field.directives?.some(
      directive => directive.name.value === 'skip' || directive.name.value === 'include',
    ) === true
  );
}

/** True when every field in the selection (recursively) is unconditional. */
function isUnconditionalSelection(selection: SelectionNode): boolean {
  if (selection.kind === Kind.FIELD) {
    if (hasConditionalDirectives(selection)) {
      return false;
    }
    if (selection.selectionSet) {
      return selection.selectionSet.selections.every(isUnconditionalSelection);
    }
    return true;
  }
  if (selection.kind === Kind.INLINE_FRAGMENT) {
    return selection.selectionSet.selections.every(isUnconditionalSelection);
  }
  return false;
}

/**
 * Computed-field deferral: keep computed fields on the single
 * subschema schema (so merge hops can select them), but strip them from
 * outbound requests that are not an internal merge hop. Internal merge hops
 * set `skipTypeMerging` and use a merge entry `fieldName`; a client query that
 * happens to call the same root field still goes through deferral.
 *
 * When a computed field is stripped, inject the type's merge-key fields
 * (`@key` / `selectionSet`) so the parent still carries identity for later
 * leftover hops. Nested key selections are preserved as parsed field nodes
 * and merged into already-selected parent fields when needed.
 */
export class DeferComputedFieldsTransform<TContext = Record<string, any>> implements Transform<
  Record<string, any>,
  TContext
> {
  private readonly computedByType: Map<string, Set<string>>;
  private readonly keyFieldsByType: Map<string, FieldNode[]>;
  private readonly mergeEntryFieldNames: Set<string>;
  private readonly schema: GraphQLSchema;

  constructor(
    schema: GraphQLSchema,
    computedByType: Map<string, Set<string>>,
    keyFieldsByType: Map<string, FieldNode[]>,
    mergeEntryFieldNames: Set<string>,
  ) {
    this.schema = schema;
    this.computedByType = computedByType;
    this.keyFieldsByType = keyFieldsByType;
    this.mergeEntryFieldNames = mergeEntryFieldNames;
  }

  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
  ): ExecutionRequest {
    // Only skip deferral for internal type-merge hops. A client can call the
    // same root field name used as a merge entry; that must still strip
    // computed fields that lack their `@requires` deps.
    if (
      delegationContext.skipTypeMerging &&
      this.mergeEntryFieldNames.has(delegationContext.fieldName)
    ) {
      return originalRequest;
    }
    return {
      ...originalRequest,
      document: stripComputedFields(
        originalRequest.document,
        this.schema,
        this.computedByType,
        this.keyFieldsByType,
      ),
    };
  }
}

function stripComputedFields(
  document: DocumentNode,
  schema: GraphQLSchema,
  computedByType: Map<string, Set<string>>,
  keyFieldsByType: Map<string, FieldNode[]>,
): DocumentNode {
  if (!computedByType.size) {
    return document;
  }

  const typeInfo = new TypeInfo(schema);
  return visit(
    document,
    visitWithTypeInfo(typeInfo, {
      [Kind.SELECTION_SET]: {
        leave(node) {
          const parentType = typeInfo.getParentType();
          if (parentType == null) {
            return node;
          }
          const typeName = getNamedType(parentType).name;
          const computed = computedByType.get(typeName);
          if (!computed?.size) {
            return node;
          }
          const keys = keyFieldsByType.get(typeName);
          const usedResponseNames = collectResponseNames(node.selections);
          const selections = filterComputedSelections(
            node.selections,
            computed,
            keys,
            usedResponseNames,
          );
          if (selections === node.selections) {
            return node;
          }
          if (!selections.length) {
            return null;
          }
          return {
            kind: Kind.SELECTION_SET,
            selections,
          };
        },
      },
    }),
  );
}

/** Deep-merge `source` selection fields into `target` (by unaliased name). */
function mergeSelectionSets(target: SelectionSetNode, source: SelectionSetNode): SelectionSetNode {
  const next: SelectionNode[] = [...target.selections];
  const indexByKey = new Map<string, number>();
  for (let i = 0; i < next.length; i++) {
    const sel = next[i]!;
    if (sel.kind === Kind.FIELD && sel.alias == null) {
      indexByKey.set(sel.name.value, i);
    }
  }
  for (const sel of source.selections) {
    if (sel.kind !== Kind.FIELD || sel.alias != null) {
      next.push(sel);
      continue;
    }
    const existingIdx = indexByKey.get(sel.name.value);
    if (existingIdx == null) {
      indexByKey.set(sel.name.value, next.length);
      next.push(sel);
      continue;
    }
    const existing = next[existingIdx]!;
    if (existing.kind === Kind.FIELD && existing.selectionSet != null && sel.selectionSet != null) {
      next[existingIdx] = {
        ...existing,
        selectionSet: mergeSelectionSets(existing.selectionSet, sel.selectionSet),
      };
    } else if (
      existing.kind === Kind.FIELD &&
      existing.selectionSet == null &&
      sel.selectionSet != null
    ) {
      next[existingIdx] = sel;
    }
  }
  return { kind: Kind.SELECTION_SET, selections: next };
}

function collectResponseNames(selections: readonly SelectionNode[]): Set<string> {
  const names = new Set<string>();
  for (const selection of selections) {
    if (selection.kind === Kind.FIELD) {
      names.add(selection.alias?.value ?? selection.name.value);
    }
  }
  return names;
}

function allocateKeyResponseName(fieldName: string, usedResponseNames: Set<string>): string {
  if (!usedResponseNames.has(fieldName)) {
    usedResponseNames.add(fieldName);
    return fieldName;
  }
  let i = 0;
  let candidate: string;
  do {
    candidate = `__stitch_key_${fieldName}_${i++}`;
  } while (usedResponseNames.has(candidate));
  usedResponseNames.add(candidate);
  return candidate;
}

function filterComputedSelections(
  selections: readonly SelectionNode[],
  computed: Set<string>,
  keyFields: FieldNode[] | undefined,
  usedResponseNames: Set<string>,
): SelectionNode[] {
  let strippedComputed = false;
  // Only unconditional, unaliased fields satisfy literal merge-key identity.
  // Aliased or @skip/@include-guarded fields must not suppress key injection.
  const presentUnconditionalUnaliased = new Map<string, number>();
  const next: SelectionNode[] = [];
  for (const selection of selections) {
    if (selection.kind === Kind.FIELD) {
      if (computed.has(selection.name.value)) {
        strippedComputed = true;
        continue;
      }
      if (selection.alias == null && isUnconditionalSelection(selection)) {
        presentUnconditionalUnaliased.set(selection.name.value, next.length);
      }
    }
    next.push(selection);
  }
  if (!strippedComputed) {
    return selections as SelectionNode[];
  }
  // The computed field stays on the schema so prepareGatewayDocument does not
  // inject key + __typename deps for it, restore identity fields here when a
  // computed leaf was the only pick.
  if (!presentUnconditionalUnaliased.has('__typename')) {
    next.unshift({
      kind: Kind.FIELD,
      name: { kind: Kind.NAME, value: '__typename' },
    });
    for (const [name, idx] of presentUnconditionalUnaliased) {
      presentUnconditionalUnaliased.set(name, idx + 1);
    }
    presentUnconditionalUnaliased.set('__typename', 0);
    usedResponseNames.add('__typename');
  }
  if (keyFields) {
    for (const keyField of keyFields) {
      if (computed.has(keyField.name.value)) {
        continue;
      }
      const existingIdx = presentUnconditionalUnaliased.get(keyField.name.value);
      if (existingIdx == null) {
        const responseName = allocateKeyResponseName(keyField.name.value, usedResponseNames);
        const injected: FieldNode =
          responseName === keyField.name.value
            ? keyField
            : {
                ...keyField,
                alias: { kind: Kind.NAME, value: responseName },
              };
        presentUnconditionalUnaliased.set(keyField.name.value, next.length);
        next.push(injected);
        continue;
      }
      // Parent already selected (e.g. `organization { name }`) while the merge
      // key needs nested identity (`organization { id }`). Merge children.
      const existing = next[existingIdx];
      if (
        existing?.kind === Kind.FIELD &&
        keyField.selectionSet != null &&
        existing.selectionSet != null
      ) {
        next[existingIdx] = {
          ...existing,
          selectionSet: mergeSelectionSets(existing.selectionSet, keyField.selectionSet),
        };
      } else if (
        existing?.kind === Kind.FIELD &&
        keyField.selectionSet != null &&
        existing.selectionSet == null
      ) {
        next[existingIdx] = keyField;
      }
    }
  }
  return next;
}

/** Top-level FieldNodes from a merge key selectionSet (nested children kept). */
function collectKeyFieldNodes(
  schema: GraphQLSchema,
  typeName: string,
  selectionSetStr: string | undefined,
): FieldNode[] {
  if (!selectionSetStr) {
    return [];
  }
  const type = schema.getType(typeName);
  if (!type || !isObjectType(type)) {
    return [];
  }
  const parsed = parseSelectionSet(selectionSetStr, { noLocation: true });
  const collected = collectFields(schema, {}, getVariableValues(undefined), type, parsed);
  const fields: FieldNode[] = [];
  for (const [, nodes] of collected.fields) {
    const first = nodes[0];
    if (first != null) {
      fields.push(first);
    }
  }
  return fields;
}

function mergeKeyFieldNodes(into: Map<string, FieldNode>, nodes: FieldNode[]) {
  for (const node of nodes) {
    const existing = into.get(node.name.value);
    if (existing == null) {
      into.set(node.name.value, node);
      continue;
    }
    // Prefer the selection that carries nested children when both exist;
    // when both have children, merge so nested key fields from every entry
    // point are preserved (e.g. organization { id } ∪ organization { slug }).
    if (node.selectionSet != null && existing.selectionSet != null) {
      into.set(node.name.value, {
        ...existing,
        selectionSet: mergeSelectionSets(existing.selectionSet, node.selectionSet),
      });
    } else if (node.selectionSet != null && existing.selectionSet == null) {
      into.set(node.name.value, node);
    }
  }
}

/**
 * Single-subschema request deferral for computed fields (`computed: true` + `selectionSet`).
 */
export function deferComputedFieldsTransformer(
  subschemaConfig: SubschemaConfig,
): Array<SubschemaConfig> {
  if (subschemaConfig.merge == null) {
    return [subschemaConfig];
  }

  const computedByType = new Map<string, Set<string>>();
  const keyFieldsByType = new Map<string, FieldNode[]>();
  const mergeEntryFieldNames = new Set<string>();
  const schema = subschemaConfig.schema;

  for (const typeName in subschemaConfig.merge) {
    const mergedTypeConfig = subschemaConfig.merge[typeName]!;
    if (mergedTypeConfig.fieldName) {
      mergeEntryFieldNames.add(mergedTypeConfig.fieldName);
    }
    for (const entry of mergedTypeConfig.entryPoints ?? []) {
      if (entry.fieldName) {
        mergeEntryFieldNames.add(entry.fieldName);
      }
    }

    const keys = new Map<string, FieldNode>();
    mergeKeyFieldNodes(keys, collectKeyFieldNodes(schema, typeName, mergedTypeConfig.selectionSet));
    for (const entry of mergedTypeConfig.entryPoints ?? []) {
      mergeKeyFieldNodes(keys, collectKeyFieldNodes(schema, typeName, entry.selectionSet));
    }
    if (keys.size) {
      keyFieldsByType.set(typeName, [...keys.values()]);
    }

    if (!mergedTypeConfig.fields) {
      continue;
    }
    let computed: Set<string> | undefined;
    for (const fieldName in mergedTypeConfig.fields) {
      const fieldConfig = mergedTypeConfig.fields[fieldName];
      if (fieldConfig?.computed && fieldConfig.selectionSet) {
        computed ||= new Set();
        computed.add(fieldName);
      }
    }
    if (computed?.size) {
      computedByType.set(typeName, computed);
    }
  }

  // Concrete types inherit computed-field / key config from implemented
  // interfaces (and other supported supertypes) when they have no explicit
  // merge config of their own for those fields.
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type)) {
      continue;
    }
    const explicitComputed = computedByType.get(type.name);
    const explicitKeys = keyFieldsByType.get(type.name);
    let inheritedComputed: Set<string> | undefined;
    const inheritedKeys = new Map<string, FieldNode>();
    for (const iface of type.getInterfaces()) {
      if (!isInterfaceType(iface)) {
        continue;
      }
      const ifaceComputed = computedByType.get(iface.name);
      if (ifaceComputed?.size) {
        inheritedComputed ||= new Set();
        for (const fieldName of ifaceComputed) {
          // Preserve explicit concrete-type config when present.
          if (!explicitComputed?.has(fieldName)) {
            inheritedComputed.add(fieldName);
          }
        }
      }
      const ifaceKeys = keyFieldsByType.get(iface.name);
      if (ifaceKeys?.length && !explicitKeys?.length) {
        mergeKeyFieldNodes(inheritedKeys, ifaceKeys);
      }
    }
    if (inheritedComputed?.size) {
      const merged = new Set(explicitComputed);
      for (const fieldName of inheritedComputed) {
        merged.add(fieldName);
      }
      computedByType.set(type.name, merged);
    }
    if (inheritedKeys.size && !explicitKeys?.length) {
      keyFieldsByType.set(type.name, [...inheritedKeys.values()]);
    }
  }

  if (!computedByType.size) {
    return [subschemaConfig];
  }

  const transform = new DeferComputedFieldsTransform(
    schema,
    computedByType,
    keyFieldsByType,
    mergeEntryFieldNames,
  );
  return [
    {
      ...subschemaConfig,
      transforms: [transform, ...(subschemaConfig.transforms ?? [])],
    },
  ];
}
