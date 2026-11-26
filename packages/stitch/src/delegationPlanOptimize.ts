import {
  Kind,
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLObjectType,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import type { StitchingInfo, Subschema } from '@graphql-tools/delegate';
import { extractUnavailableFieldsFromSelectionSet } from '@graphql-tools/delegate';

/**
 * True when `selectionSet` asks for any field that has a `@requires` /
 * computed selectionSet on `subschema`. Absorbing such fields onto that
 * destination would bypass `fieldRequiresSatisfied`.
 */
function selectionRequiresOnSubschema(
  stitchingInfo: StitchingInfo | undefined,
  subschema: Subschema,
  typeName: string,
  selectionSet: SelectionSetNode,
): boolean {
  const fieldSels = stitchingInfo?.mergedTypes[typeName]?.fieldSelectionSets.get(subschema);
  if (fieldSels == null) {
    return false;
  }
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD && fieldSels[sel.name.value] != null) {
      return true;
    }
  }
  return false;
}

/**
 * Absorb selections onto a subschema that already covers them.
 */
export function optimizeDelegationMap(
  delegationMap: Map<Subschema, SelectionSetNode>,
  typeName: string,
  fragments: Record<string, FragmentDefinitionNode>,
  stitchingInfo?: StitchingInfo,
  /**
   * Field names pinned by an accepted progressive-override target. These must
   * stay on their current subschema; other fields may still coalesce.
   */
  pinnedFields?: ReadonlySet<string>,
): Map<Subschema, SelectionSetNode> {
  for (const [subschema, selectionSet] of delegationMap) {
    const movableSelections = pinnedFields?.size
      ? selectionSet.selections.filter(
          sel => sel.kind !== Kind.FIELD || !pinnedFields.has(sel.name.value),
        )
      : selectionSet.selections;
    const pinnedSelections = pinnedFields?.size
      ? selectionSet.selections.filter(
          sel => sel.kind === Kind.FIELD && pinnedFields.has(sel.name.value),
        )
      : [];
    if (!movableSelections.length) {
      continue;
    }
    const movableSelectionSet: SelectionSetNode = {
      kind: Kind.SELECTION_SET,
      selections: movableSelections,
    };
    for (const [subschema2, selectionSet2] of delegationMap) {
      if (subschema === subschema2) {
        continue;
      }
      // Schema coverage alone is not enough for computed fields:
      // do not move fields onto a destination that gates them behind @requires.
      if (selectionRequiresOnSubschema(stitchingInfo, subschema2, typeName, movableSelectionSet)) {
        continue;
      }
      const unavailableFields = extractUnavailableFieldsFromSelectionSet(
        subschema2.transformedSchema,
        subschema2.transformedSchema.getType(typeName) as GraphQLObjectType,
        movableSelectionSet,
        () => true,
        fragments,
      );
      if (!unavailableFields.length) {
        delegationMap.set(subschema2, {
          kind: Kind.SELECTION_SET,
          selections: [...selectionSet2.selections, ...movableSelections],
        });
        if (pinnedSelections.length) {
          delegationMap.set(subschema, {
            kind: Kind.SELECTION_SET,
            selections: pinnedSelections,
          });
        } else {
          delegationMap.delete(subschema);
        }
      }
    }
  }
  return delegationMap;
}

function fieldArgsKey(field: FieldNode): string {
  if (!field.arguments?.length) {
    return '';
  }
  return JSON.stringify(field.arguments.map(a => [a.name.value, a.value]));
}

function fieldResponseKey(field: FieldNode): string {
  return field.alias?.value ?? field.name.value;
}

function selectionsCompatibleForUnion(a: SelectionSetNode, b: SelectionSetNode): boolean {
  const aFields = new Map<string, FieldNode>();
  for (const sel of a.selections) {
    if (sel.kind === Kind.FIELD) {
      aFields.set(fieldResponseKey(sel), sel);
    }
  }
  for (const sel of b.selections) {
    if (sel.kind !== Kind.FIELD) {
      continue;
    }
    const key = fieldResponseKey(sel);
    const prior = aFields.get(key);
    if (!prior) {
      continue;
    }
    if (prior.name.value !== sel.name.value || fieldArgsKey(prior) !== fieldArgsKey(sel)) {
      return false;
    }
    if (prior.selectionSet && sel.selectionSet) {
      if (!selectionsCompatibleForUnion(prior.selectionSet, sel.selectionSet)) {
        return false;
      }
    } else if (prior.selectionSet || sel.selectionSet) {
      return false;
    }
  }
  return true;
}

function unionSelectionSets(a: SelectionSetNode, b: SelectionSetNode): SelectionSetNode {
  const byKey = new Map<string, SelectionNode>();
  const add = (sel: SelectionNode) => {
    if (sel.kind === Kind.FIELD) {
      const key = `f:${fieldResponseKey(sel)}`;
      const prior = byKey.get(key);
      if (!prior || prior.kind !== Kind.FIELD) {
        byKey.set(key, sel);
        return;
      }
      if (prior.selectionSet && sel.selectionSet) {
        byKey.set(key, {
          ...prior,
          selectionSet: unionSelectionSets(prior.selectionSet, sel.selectionSet),
        });
      }
      return;
    }
    byKey.set(JSON.stringify(sel), sel);
  };
  for (const sel of a.selections) {
    add(sel);
  }
  for (const sel of b.selections) {
    add(sel);
  }
  return { kind: Kind.SELECTION_SET, selections: [...byKey.values()] };
}

function collectSelectedFieldNames(selectionSet: SelectionSetNode): Set<string> {
  const names = new Set<string>();
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      names.add(sel.name.value);
    }
  }
  return names;
}

function findMergeFieldConfig(
  stitchingInfo: StitchingInfo | undefined,
  subschema: Subschema,
  typeName: string,
  fieldName: string,
) {
  const direct = subschema.merge?.[typeName]?.fields?.[fieldName];
  if (direct?.selectionSet || direct?.computed) {
    return direct;
  }
  if (!stitchingInfo) {
    return direct;
  }
  for (const s of stitchingInfo.subschemaMap.values()) {
    if (subschema.name && s.name !== subschema.name) {
      continue;
    }
    const field = s.merge?.[typeName]?.fields?.[fieldName];
    if (field?.selectionSet || field?.computed) {
      return field;
    }
  }
  return undefined;
}

function requiresDepsForField(
  stitchingInfo: StitchingInfo | undefined,
  subschema: Subschema,
  typeName: string,
  fieldName: string,
): FieldNode[] {
  if (fieldName === '__typename') {
    return [];
  }
  const mergeField = findMergeFieldConfig(stitchingInfo, subschema, typeName, fieldName);
  if (!mergeField?.selectionSet && !mergeField?.computed) {
    return [];
  }
  return stitchingInfo?.fieldNodesByField?.[typeName]?.[fieldName] ?? [];
}

function selectionRequiresCount(
  stitchingInfo: StitchingInfo | undefined,
  subschema: Subschema,
  typeName: string,
  selectionSet: SelectionSetNode,
): number {
  let n = 0;
  for (const sel of selectionSet.selections) {
    if (sel.kind !== Kind.FIELD) {
      continue;
    }
    n += requiresDepsForField(stitchingInfo, subschema, typeName, sel.name.value).length;
  }
  return n;
}

function requiresArgsCompatibleForMaps(
  stitchingInfo: StitchingInfo | undefined,
  typeName: string,
  a: { subschema: Subschema; selectionSet: SelectionSetNode },
  b: { subschema: Subschema; selectionSet: SelectionSetNode },
): boolean {
  const byName = new Map<string, string>();
  for (const entry of [a, b]) {
    for (const sel of entry.selectionSet.selections) {
      if (sel.kind !== Kind.FIELD) {
        continue;
      }
      for (const dep of requiresDepsForField(
        stitchingInfo,
        entry.subschema,
        typeName,
        sel.name.value,
      )) {
        const args = fieldArgsKey(dep);
        const prev = byName.get(dep.name.value);
        if (prev != null && prev !== args) {
          return false;
        }
        byName.set(dep.name.value, args);
      }
    }
  }
  return true;
}

function hasCircularSelectedRequires(
  stitchingInfo: StitchingInfo | undefined,
  subschema: Subschema,
  typeName: string,
  selected: ReadonlySet<string>,
): boolean {
  for (const name of selected) {
    const deps = requiresDepsForField(stitchingInfo, subschema, typeName, name);
    for (const dep of deps) {
      if (dep.name.value === name || !selected.has(dep.name.value)) {
        continue;
      }
      const depMerge = findMergeFieldConfig(stitchingInfo, subschema, typeName, dep.name.value);
      if (depMerge?.selectionSet || depMerge?.computed) {
        return true;
      }
    }
  }
  return false;
}

/**
 * True when a selected field's @requires / computed deps include another
 * field that is only being fetched in the same coalesced stage.
 */
function hasSameStageRequiresPrerequisite(
  stitchingInfo: StitchingInfo | undefined,
  subschema: Subschema,
  typeName: string,
  selected: ReadonlySet<string>,
): boolean {
  for (const name of selected) {
    const deps = requiresDepsForField(stitchingInfo, subschema, typeName, name);
    for (const dep of deps) {
      if (dep.name.value !== name && selected.has(dep.name.value)) {
        return true;
      }
    }
  }
  return false;
}

function cloneDelegationMap(
  map: Map<Subschema, SelectionSetNode>,
): Map<Subschema, SelectionSetNode> {
  return new Map(map);
}

/**
 * Inventory pattern: when stage N has a non-`@requires` selection
 * on subgraph S and stage N+1 has a `@requires` selection on the same S,
 * move the non-requires fields into the requires hop so resolve-time merging
 * does one `_entities` (e.g. `inStock` ∪ `shippingEstimate`) after PRODUCTS
 * has provided `price`/`weight`.
 *
 * Gates: same subgraph name, requires-args compatible, selection-union safe,
 * no circular selected requires. Does not promote leftover into planned stages.
 */
export function coalesceAdjacentDelegationMaps(
  delegationMaps: Array<Map<Subschema, SelectionSetNode>>,
  typeName: string,
  stitchingInfo?: StitchingInfo,
): Array<Map<Subschema, SelectionSetNode>> {
  if (delegationMaps.length < 2 || stitchingInfo == null) {
    return delegationMaps;
  }
  const out: Array<Map<Subschema, SelectionSetNode>> = [];
  for (const map of delegationMaps) {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push(cloneDelegationMap(map));
      continue;
    }
    const next = cloneDelegationMap(map);
    let moved = false;
    for (const [nextSub, nextSel] of [...next.entries()]) {
      if (!nextSub.name) {
        continue;
      }
      const nextReq = selectionRequiresCount(stitchingInfo, nextSub, typeName, nextSel);
      if (nextReq === 0) {
        continue;
      }
      // Pulling an earlier fetch into this stage is only safe when no other
      // subgraph in the later stage still needs those fields as merge args /
      // @requires (they are built before the stage runs). Inventory coalesce
      // is same-subgraph-only stages.
      const nextHasForeignSubgraph = [...next.keys()].some(s => s.name !== nextSub.name);
      if (nextHasForeignSubgraph) {
        continue;
      }
      for (const [prevSub, prevSel] of [...prev.entries()]) {
        if (prevSub.name !== nextSub.name) {
          continue;
        }
        const prevReq = selectionRequiresCount(stitchingInfo, prevSub, typeName, prevSel);
        // Inventory pattern only: non-requires then requires on same subgraph.
        if (prevReq !== 0) {
          continue;
        }
        const prevEntry = { subschema: prevSub, selectionSet: prevSel };
        const nextEntry = { subschema: nextSub, selectionSet: nextSel };
        if (
          !requiresArgsCompatibleForMaps(stitchingInfo, typeName, prevEntry, nextEntry) ||
          !selectionsCompatibleForUnion(prevSel, nextSel)
        ) {
          continue;
        }
        const selectionSet = unionSelectionSets(prevSel, nextSel);
        const selected = collectSelectedFieldNames(selectionSet);
        // Do not merge when a selection in this stage needs a @requires /
        // merge-key prerequisite that is only supplied by another selection
        // in the same stage — that prerequisite is not available before the
        // stage runs. Preserve the earlier stage when that happens.
        if (
          hasCircularSelectedRequires(stitchingInfo, nextSub, typeName, selected) ||
          hasSameStageRequiresPrerequisite(stitchingInfo, nextSub, typeName, selected)
        ) {
          continue;
        }
        next.set(nextSub, selectionSet);
        prev.delete(prevSub);
        moved = true;
      }
    }
    if (prev.size === 0) {
      out.pop();
    }
    out.push(next);
    if (!moved && prev.size > 0) {
      // next was cloned even when nothing moved - fine for immutability
    }
  }
  return out;
}
