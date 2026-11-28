import {
  getNamedType,
  isNullableType,
  isObjectType,
  isUnionType,
  Kind,
  visit,
  type DocumentNode,
  type FieldNode,
  type GraphQLObjectType,
  type GraphQLSchema,
  type OperationDefinitionNode,
  type SelectionNode,
  type SelectionSetNode,
  type VariableDefinitionNode,
} from 'graphql';
import type { Subschema } from '@graphql-tools/delegate';
import {
  buildBatchedMergeDocument,
  getBatchedMergeEntry,
  inferMergeArgName,
  mergeVariableName,
} from './mergeEntry.js';
import type { StitchBatchAlias, StitchPlanNode } from './types.js';

const TYPENAME_FIELD: FieldNode = {
  kind: Kind.FIELD,
  name: { kind: Kind.NAME, value: '__typename' },
};

function pushOrMergeField(next: SelectionNode[], seen: Map<string, number>, sel: FieldNode): void {
  const key = sel.alias?.value ?? sel.name.value;
  const idx = seen.get(key);
  if (idx != null) {
    const prev = next[idx];
    if (prev?.kind === Kind.FIELD && (sel.selectionSet || prev.selectionSet)) {
      const sels = [
        ...(prev.selectionSet?.selections ?? []),
        ...(sel.selectionSet?.selections ?? []),
      ];
      next[idx] = {
        ...prev,
        selectionSet: sels.length ? { kind: Kind.SELECTION_SET, selections: sels } : undefined,
      };
    }
    return;
  }
  seen.set(key, next.length);
  next.push(sel);
}

/**
 * Hive QP strips selections to what the target subgraph can resolve - at plan
 * time. Recurse into nested selections; inject `__typename` for later entity
 * matching. Fragment spreads become inline fragments when the type exists.
 *
 * When a field is absent from the subgraph but `fieldNodesByField` lists key
 * deps that *are* present (e.g. Book.author @resolveTo -> authorId), those deps
 * are injected so nested Islands can read their keys.
 *
 * Union types have no fields - only fragment selections are kept (never collapse
 * the whole set to bare `__typename`, which emptied union root fetches).
 */
export function filterSelectionSetForSubschema(
  selectionSet: SelectionSetNode,
  typeName: string,
  schema: GraphQLSchema,
  fragments: Record<
    string,
    {
      typeCondition: { name: { value: string } };
      selectionSet: SelectionSetNode;
    }
  >,
  fieldNodesByField?: Record<string, Record<string, FieldNode[]>>,
): SelectionSetNode {
  const type = schema.getType(typeName);
  if (!type) {
    return { kind: Kind.SELECTION_SET, selections: [TYPENAME_FIELD] };
  }

  if (isUnionType(type)) {
    const next: SelectionNode[] = [];
    let hasTypename = false;
    const members = new Set(type.getTypes().map(t => t.name));
    for (const sel of selectionSet.selections) {
      if (sel.kind === Kind.FIELD) {
        if (sel.name.value === '__typename') {
          hasTypename = true;
          next.push(sel);
        }
        continue;
      }
      if (sel.kind === Kind.INLINE_FRAGMENT) {
        const on = sel.typeCondition?.name.value;
        if (on) {
          if (!schema.getType(on) || !members.has(on)) {
            continue;
          }
        }
        const filtered = filterSelectionSetForSubschema(
          sel.selectionSet,
          on ?? typeName,
          schema,
          fragments,
          fieldNodesByField,
        );
        if (filtered.selections.length) {
          next.push({ ...sel, selectionSet: filtered });
        }
        continue;
      }
      if (sel.kind === Kind.FRAGMENT_SPREAD) {
        const frag = fragments[sel.name.value];
        if (!frag) {
          continue;
        }
        const on = frag.typeCondition.name.value;
        if (!schema.getType(on) || !members.has(on)) {
          continue;
        }
        const filtered = filterSelectionSetForSubschema(
          frag.selectionSet,
          on,
          schema,
          fragments,
          fieldNodesByField,
        );
        if (filtered.selections.length) {
          next.push({
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: { kind: Kind.NAME, value: on },
            },
            selectionSet: filtered,
          });
        }
      }
    }
    if (!hasTypename) {
      next.unshift(TYPENAME_FIELD);
    }
    return { kind: Kind.SELECTION_SET, selections: next };
  }

  if (!('getFields' in type)) {
    return { kind: Kind.SELECTION_SET, selections: [TYPENAME_FIELD] };
  }
  const fields = (type as { getFields(): Record<string, { type: any }> }).getFields();
  const next: SelectionNode[] = [];
  let hasTypename = false;
  const seen = new Map<string, number>();
  const pushField = (sel: FieldNode) => pushOrMergeField(next, seen, sel);
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      const name = sel.name.value;
      if (name === '__typename') {
        hasTypename = true;
        pushField(sel);
        continue;
      }
      const field = fields[name];
      if (!field) {
        // Gateway-local field stripped here - still pull its key deps
        // (authorId for Book.author) so nested Islands can resolve.
        const deps = fieldNodesByField?.[typeName]?.[name];
        if (deps?.length) {
          for (const dep of deps) {
            if (dep.name.value === '__typename') {
              continue;
            }
            // `fields` is already the target subgraph schema's field map.
            if (fields[dep.name.value]) {
              pushField(dep);
            }
          }
        }
        continue;
      }
      if (!sel.selectionSet) {
        pushField(sel);
        continue;
      }
      const childTypeName = (getNamedType(field.type as any) as unknown as { name: string }).name;
      pushField({
        ...sel,
        selectionSet: filterSelectionSetForSubschema(
          sel.selectionSet,
          childTypeName,
          schema,
          fragments,
          fieldNodesByField,
        ),
      });
      continue;
    }
    if (sel.kind === Kind.INLINE_FRAGMENT) {
      const on = sel.typeCondition?.name.value ?? typeName;
      if (sel.typeCondition && !schema.getType(on)) {
        continue;
      }
      if (
        sel.typeCondition &&
        isObjectType(type) &&
        on !== type.name &&
        isObjectType(schema.getType(on))
      ) {
        continue;
      }
      const filtered = filterSelectionSetForSubschema(
        sel.selectionSet,
        on,
        schema,
        fragments,
        fieldNodesByField,
      );
      if (filtered.selections.length) {
        next.push({ ...sel, selectionSet: filtered });
      }
      continue;
    }
    if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const frag = fragments[sel.name.value];
      if (!frag) {
        continue;
      }
      const on = frag.typeCondition.name.value;
      if (!schema.getType(on)) {
        continue;
      }
      const filtered = filterSelectionSetForSubschema(
        frag.selectionSet,
        on,
        schema,
        fragments,
        fieldNodesByField,
      );
      if (filtered.selections.length) {
        next.push({
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: { kind: Kind.NAME, value: on },
          },
          selectionSet: filtered,
        });
      }
    }
  }
  if (!hasTypename) {
    next.unshift(TYPENAME_FIELD);
  }
  return { kind: Kind.SELECTION_SET, selections: next };
}

function targetSchema(subschema: Subschema): GraphQLSchema {
  return subschema.schema;
}

function collectUsedVariableNames(node: SelectionNode): Set<string> {
  const used = new Set<string>();
  visit(node, {
    Variable(v) {
      used.add(v.name.value);
    },
  });
  return used;
}

function filterVariableDefinitions(
  defs: readonly VariableDefinitionNode[] | undefined,
  used: Set<string>,
): VariableDefinitionNode[] | undefined {
  if (!defs?.length) {
    return undefined;
  }
  const filtered = defs.filter(d => used.has(d.variable.name.value));
  return filtered.length ? filtered : undefined;
}

/** Same as execute rewriteNullabilityConflicts - plan-time for root docs. */
function rewriteNullabilityConflicts(
  selectionSet: SelectionSetNode,
  schema: GraphQLSchema,
): SelectionSetNode {
  const seenNonNullable = new Set<string>();
  const seenNullable = new Set<string>();
  const selections = selectionSet.selections.map(sel => {
    if (sel.kind !== Kind.INLINE_FRAGMENT || !sel.typeCondition) {
      if (sel.kind === Kind.FIELD && sel.selectionSet) {
        return {
          ...sel,
          selectionSet: rewriteNullabilityConflicts(sel.selectionSet, schema),
        };
      }
      return sel;
    }
    const type = schema.getType(sel.typeCondition.name.value);
    if (!type || !('getFields' in type) || !sel.selectionSet) {
      return sel;
    }
    const fields = (type as GraphQLObjectType).getFields();
    const nextSels = sel.selectionSet.selections.map(sub => {
      if (sub.kind !== Kind.FIELD || sub.alias) {
        if (sub.kind === Kind.FIELD && sub.selectionSet) {
          return {
            ...sub,
            selectionSet: rewriteNullabilityConflicts(sub.selectionSet, schema),
          };
        }
        return sub;
      }
      const field = fields[sub.name.value];
      if (!field) {
        return sub;
      }
      const nullable = isNullableType(field.type);
      if (nullable) {
        seenNullable.add(sub.name.value);
      } else {
        seenNonNullable.add(sub.name.value);
      }
      if (seenNullable.has(sub.name.value) && seenNonNullable.has(sub.name.value)) {
        return {
          ...sub,
          alias: {
            kind: Kind.NAME,
            value: nullable ? `_nullable_${sub.name.value}` : `_nonNullable_${sub.name.value}`,
          },
          selectionSet: sub.selectionSet
            ? rewriteNullabilityConflicts(sub.selectionSet, schema)
            : undefined,
        };
      }
      return sub.selectionSet
        ? {
            ...sub,
            selectionSet: rewriteNullabilityConflicts(sub.selectionSet, schema),
          }
        : sub;
    });
    return {
      ...sel,
      selectionSet: {
        ...sel.selectionSet,
        selections: nextSels as readonly SelectionNode[],
      },
    };
  });
  return { ...selectionSet, selections: selections as readonly SelectionNode[] };
}

function buildRootFetchDocument(
  operation: OperationDefinitionNode,
  fieldNode: FieldNode,
  subgraphSchema: GraphQLSchema,
): DocumentNode {
  // Keep nested @skip/@include for subgraph evaluation (provides-scope /
  // Condition). Root Condition nodes strip only the root field's own
  // directives before planning.
  //
  // Do NOT run filterSelectionSetForSubschema here: the planner already
  // partitioned available (+ @provides) selections onto this rootField.
  // Re-filtering against the raw subgraph SDL strips @provides fields
  // (Book.title, Product.categories, User.name) that federation still
  // resolves on the providing root. Gateway-only merge keys (Product.pid)
  // are kept out earlier via raw-schema dep checks in partition/inject.
  let cleaned = fieldNode;
  if (cleaned.selectionSet) {
    cleaned = {
      ...cleaned,
      selectionSet: rewriteNullabilityConflicts(cleaned.selectionSet, subgraphSchema),
    };
  }
  const usedVars = collectUsedVariableNames(cleaned);
  const filteredDefs = filterVariableDefinitions(operation.variableDefinitions, usedVars);
  return {
    kind: Kind.DOCUMENT,
    definitions: [
      {
        kind: Kind.OPERATION_DEFINITION,
        operation: operation.operation,
        name: operation.name,
        variableDefinitions: filteredDefs,
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: [cleaned],
        },
      },
    ],
  };
}

export interface PreparePlanDocumentsOptions {
  operation: OperationDefinitionNode;
  fragments: Record<string, any>;
  /** Used to inject key deps for gateway-local fields stripped from subgraph docs. */
  fieldNodesByField?: Record<string, Record<string, FieldNode[]>>;
}

/**
 * Attach prebuilt subgraph documents (Hive QP model).
 * Original selectionSets stay intact for Transformer fallback on nested/abstract.
 */
export function preparePlanDocuments(
  root: StitchPlanNode,
  options: PreparePlanDocumentsOptions,
): StitchPlanNode {
  const { operation, fragments, fieldNodesByField } = options;
  if (root.kind === 'Sequence' || root.kind === 'Parallel') {
    return {
      kind: root.kind,
      nodes: root.nodes.map(n => preparePlanDocuments(n, options)),
    };
  }
  if (root.kind === 'Condition') {
    return {
      ...root,
      ifClause: root.ifClause ? preparePlanDocuments(root.ifClause, options) : undefined,
      elseClause: root.elseClause ? preparePlanDocuments(root.elseClause, options) : undefined,
    };
  }
  if (root.kind === 'Island') {
    return root.continue
      ? {
          ...root,
          continue: preparePlanDocuments(root.continue, options),
        }
      : root;
  }
  if (root.kind === 'Fetch') {
    if (root.rootField) {
      return {
        ...root,
        document: buildRootFetchDocument(operation, root.rootField, targetSchema(root.subschema)),
      };
    }
    if (!root.entityTypeName) {
      return root;
    }
    const schema = targetSchema(root.subschema);
    const filtered = filterSelectionSetForSubschema(
      root.selectionSet,
      root.entityTypeName,
      schema,
      fragments,
      fieldNodesByField,
    );
    const entry = getBatchedMergeEntry(root.subschema, root.entityTypeName);
    const document =
      entry != null
        ? (buildBatchedMergeDocument(
            schema,
            entry,
            [
              {
                entityTypeName: root.entityTypeName,
                selectionSet: filtered,
              },
            ],
            operation.name,
          ) ?? undefined)
        : undefined;
    return {
      ...root,
      document,
    };
  }
  if (root.kind === 'BatchFetch') {
    const schema = targetSchema(root.subschema);
    const filteredAliases = root.aliases.map(a => ({
      ...a,
      selectionSet: filterSelectionSetForSubschema(
        a.selectionSet,
        a.entityTypeName,
        schema,
        fragments,
        fieldNodesByField,
      ),
    }));
    // One prebuilt doc only when every alias shares the same merge field + arg.
    const entries = filteredAliases.map(a =>
      getBatchedMergeEntry(root.subschema, a.entityTypeName),
    );
    const first = entries[0];
    const argName = first != null ? inferMergeArgName(first.argsFromKeys) : null;
    const canBatchDoc =
      first != null &&
      argName != null &&
      entries.every(
        e =>
          e != null &&
          e.fieldName === first.fieldName &&
          inferMergeArgName(e.argsFromKeys) === argName,
      );
    const aliases: StitchBatchAlias[] = filteredAliases.map(a => ({
      ...a,
      representationsVariable: canBatchDoc ? mergeVariableName(argName!) : undefined,
    }));
    const document = canBatchDoc
      ? (buildBatchedMergeDocument(
          schema,
          first!,
          aliases.map(a => ({
            entityTypeName: a.entityTypeName,
            selectionSet: a.selectionSet,
          })),
          operation.name,
        ) ?? undefined)
      : undefined;
    return {
      ...root,
      aliases,
      document,
    };
  }
  return root;
}
