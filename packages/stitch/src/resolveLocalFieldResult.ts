import {
  getNamedType,
  isAbstractType,
  Kind,
  type FragmentDefinitionNode,
  type GraphQLResolveInfo,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import { isExternalObject, type StitchingInfo, type Subschema } from '@graphql-tools/delegate';
import { mergeDeep } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

// presence-based only: values are not type-checked, a null leaf counts as
// satisfied while a null object with a requested sub-selection does not
function valueSatisfiesSelectionSet(value: unknown, selectionSet: SelectionSetNode): boolean {
  if (Array.isArray(value)) {
    return value.every(item => valueSatisfiesSelectionSet(item, selectionSet));
  }
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const objectValue = value as Record<string, unknown>;
  return selectionSet.selections.every(selection => {
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      return valueSatisfiesSelectionSet(value, selection.selectionSet);
    }
    if (selection.kind !== Kind.FIELD) {
      return false;
    }
    const responseKey = selection.alias?.value || selection.name.value;
    return (
      objectValue[responseKey] !== undefined &&
      (selection.selectionSet == null ||
        valueSatisfiesSelectionSet(objectValue[responseKey], selection.selectionSet))
    );
  });
}

/**
 * Takes a plain object produced by a local resolver and resolves it through
 * type merging when needed:
 *
 * - If the object already satisfies the requested selection set, it is
 *   returned as-is and no delegation happens. This is the fast path for
 *   resolvers that return complete values.
 * - If requested fields are missing but the object satisfies a merge key of
 *   the return type, only the missing fields are delegated to the owning
 *   subschema. The merge key is only the entry ticket; fields the object
 *   already carries are kept as-is and never fetched from the subschema, and
 *   the merged result keeps merging nested fields through the usual
 *   stitching flow.
 * - Payloads are raw resolver results keyed by literal field name, so
 *   aliased requests are matched by field name and aliased fields already in
 *   the payload are not fetched again. Hydrated results carry only literal
 *   field names; stitch `defaultMergedResolver` falls back to the field name
 *   when the aliased response key is absent, so incoming query aliases resolve
 *   with plain graphql-js semantics.
 * - When merge keys of several subschemas are satisfied, a subschema without
 *   computed field dependencies starts the delegation. Type merging stays
 *   enabled so the stitching planner resolves fields owned by other subschemas.
 * - Fields listed in `providedFields` (fields that have their own resolver on
 *   the stitched schema) are excluded from the required selection, because
 *   they are resolved locally anyway. When the remaining selection is already
 *   satisfied by the object, no delegation happens at all.
 * - Objects that satisfy no merge key, are already external, or are not
 *   objects at all are returned untouched, so missing non-nullable fields
 *   error downstream exactly as they would without this helper.
 */
export function resolveLocalFieldResult<TContext extends Record<string, any> = Record<string, any>>(
  result: any,
  context: TContext,
  info: GraphQLResolveInfo,
  stitchingInfo = info.schema.extensions?.stitchingInfo as StitchingInfo<TContext>,
  providedFields?: ReadonlySet<string>,
): any {
  if (stitchingInfo == null || result == null) {
    return result;
  }
  return resolveOne(result, context, info, stitchingInfo, providedFields);
}

// selections the value does not cover, so only those get delegated;
// the payload is a raw resolver result keyed by field name (aliases are a
// client-side concern); null composites are missing, null leaves are not
function getMissingSelections(
  value: unknown,
  selections: readonly SelectionNode[],
  fragments: Record<string, FragmentDefinitionNode> = {},
): SelectionNode[] {
  if (value == null || typeof value !== 'object') {
    return [...selections];
  }
  const objectValue = value as Record<string, unknown>;
  const missing: SelectionNode[] = [];
  for (const selection of selections) {
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      const sub = getMissingSelections(value, selection.selectionSet.selections, fragments);
      if (sub.length) {
        missing.push({
          ...selection,
          selectionSet: { kind: Kind.SELECTION_SET, selections: sub },
        });
      }
      continue;
    }
    if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const fragment = fragments[selection.name.value];
      if (fragment == null) {
        missing.push(selection);
        continue;
      }
      const sub = getMissingSelections(value, fragment.selectionSet.selections, fragments);
      if (sub.length) {
        missing.push({
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: fragment.typeCondition,
          directives: [...(fragment.directives ?? []), ...(selection.directives ?? [])],
          selectionSet: { kind: Kind.SELECTION_SET, selections: sub },
        });
      }
      continue;
    }
    const fieldValue = objectValue[selection.name.value];
    if (fieldValue === undefined || (fieldValue === null && selection.selectionSet != null)) {
      missing.push(selection);
      continue;
    }
    if (selection.selectionSet != null) {
      if (Array.isArray(fieldValue)) {
        // ponytail: any incomplete item keeps the whole sub-selection, per-item
        // diffs are not worth it for list payloads
        const anyMissing = fieldValue.some(
          item =>
            getMissingSelections(item, selection.selectionSet!.selections, fragments).length > 0,
        );
        if (anyMissing) {
          missing.push(selection);
        }
      } else {
        const sub = getMissingSelections(fieldValue, selection.selectionSet.selections, fragments);
        if (sub.length) {
          missing.push({
            ...selection,
            selectionSet: { kind: Kind.SELECTION_SET, selections: sub },
          });
        }
      }
    }
  }
  return missing;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function mergeLocalWithDelegated(local: unknown, resolved: unknown): unknown {
  if (Array.isArray(local) && Array.isArray(resolved)) {
    // Do not concatenate via mergeDeep. Merge by index when lengths match;
    // otherwise the delegated list is authoritative.
    if (local.length !== resolved.length) {
      return resolved;
    }
    return local.map((item, index) => mergeLocalWithDelegated(item, resolved[index]));
  }
  if (isPlainObject(local) && isPlainObject(resolved)) {
    // Merge both sources so non-enumerable ExternalObject symbols from the
    // delegated result survive. Nested type merging (e.g. Review.content after
    // a Product stub from @resolveTo) depends on those annotations; starting
    // from `local` alone strips them and leaves nested fields unresolved.
    const out = mergeDeep([local, resolved], false, false, false, true) as Record<string, unknown>;
    // Re-walk overlapping composite keys for list-aware merges (mergeDeep
    // concatenates equal-length arrays by default).
    for (const key of Object.keys(local)) {
      if (!Object.prototype.hasOwnProperty.call(resolved, key)) {
        continue;
      }
      const localVal = local[key];
      const resolvedVal = resolved[key];
      if (
        (Array.isArray(localVal) && Array.isArray(resolvedVal)) ||
        (isPlainObject(localVal) && isPlainObject(resolvedVal))
      ) {
        out[key] = mergeLocalWithDelegated(localVal, resolvedVal);
      }
    }
    return out;
  }
  // Delegated value wins on scalar / mismatched-shape overlaps.
  return resolved !== undefined ? resolved : local;
}

function resolveOne<TContext extends Record<string, any>>(
  value: unknown,
  context: TContext,
  info: GraphQLResolveInfo,
  stitchingInfo: StitchingInfo<TContext>,
  providedFields?: ReadonlySet<string>,
): any {
  if (Array.isArray(value)) {
    return value.map(item =>
      handleMaybePromise(
        () => item,
        resolvedItem => resolveOne(resolvedItem, context, info, stitchingInfo, providedFields),
      ),
    );
  }
  if (
    value == null ||
    typeof value !== 'object' ||
    value instanceof Error ||
    isExternalObject(value)
  ) {
    return value;
  }
  const objectValue = value as Record<string, unknown>;
  const returnType = getNamedType(info.returnType);
  const typeName =
    typeof objectValue.__typename === 'string' ? objectValue.__typename : returnType.name;
  const mergedTypeInfo = stitchingInfo.mergedTypes[typeName];
  if (mergedTypeInfo == null) {
    return value;
  }
  let selections = info.fieldNodes.flatMap(fieldNode => fieldNode.selectionSet?.selections ?? []);
  if (providedFields?.size) {
    // Local field resolvers are excluded from the required selection, but
    // their declared selectionSet dependencies (fieldNodesByField) must still
    // be hydrated when absent from the parent.
    const dependencySelections: SelectionNode[] = [];
    const fieldDeps = stitchingInfo.fieldNodesByField?.[typeName];
    selections = selections.filter(selection => {
      if (selection.kind !== Kind.FIELD || !providedFields.has(selection.name.value)) {
        return true;
      }
      const deps = fieldDeps?.[selection.name.value];
      if (deps?.length) {
        for (const dep of deps) {
          dependencySelections.push(dep);
        }
      }
      return false;
    });
    if (dependencySelections.length) {
      selections = [...selections, ...dependencySelections];
    }
  }
  const missingSelections = getMissingSelections(value, selections, info.fragments);
  if (!missingSelections.length) {
    return value;
  }
  const selectionSet: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: missingSelections,
  };
  // Single-key selectionSets and multi-entryPoint key sets must compete in one
  // list. Otherwise a computed-only owner (e.g. inventory `@requires`) that
  // shares `{ id }` wins before the real Product owner living only in
  // entryPointSelectionSets.
  const candidates: Array<[Subschema<any, any, any, TContext>, SelectionSetNode[]]> = [];
  for (const [subschema, keySelectionSet] of mergedTypeInfo.selectionSets) {
    candidates.push([subschema, [keySelectionSet]]);
  }
  if (mergedTypeInfo.entryPointSelectionSets) {
    for (const [subschema, keySelectionSets] of mergedTypeInfo.entryPointSelectionSets) {
      candidates.push([subschema, keySelectionSets]);
    }
  }
  candidates.sort(
    ([a], [b]) =>
      Number(Boolean(a.merge?.[typeName]?.fields)) - Number(Boolean(b.merge?.[typeName]?.fields)),
  );
  for (const [subschema, keySelectionSets] of candidates) {
    if (!keySelectionSets.some(ks => valueSatisfiesSelectionSet(value, ks))) {
      continue;
    }
    const resolver = mergedTypeInfo.resolvers.get(subschema);
    if (resolver == null) {
      continue;
    }
    // Add __typename on a separate payload so the resolver's returned object
    // is not mutated.
    const mergePayload =
      objectValue.__typename == null && !isAbstractType(returnType)
        ? { ...objectValue, __typename: typeName }
        : objectValue;
    return handleMaybePromise(
      () =>
        resolver(
          mergePayload,
          context,
          info,
          subschema,
          selectionSet,
          undefined,
          returnType,
          false,
        ),
      // mergePayload comes first so the delegation result wins on overlaps, while
      // payload fields outside the delegated selection (like the key) survive;
      // respectNonEnumerableSymbols keeps the external object annotation intact
      resolved => mergeLocalWithDelegated(mergePayload, resolved),
    );
  }
  return value;
}
