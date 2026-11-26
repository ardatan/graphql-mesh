import {
  getNamedType,
  isAbstractType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  Kind,
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLCompositeType,
  type GraphQLFieldMap,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import {
  extractUnavailableFields,
  handleOverrideByDelegation,
  leftOverByDelegationPlan,
  type DelegationPlanBuilder,
  type MergedTypeInfo,
  type StitchingInfo,
  type Subschema,
} from '@graphql-tools/delegate';
import { memoize1, memoize2, memoize3 } from '@graphql-tools/utils';
import { coalesceAdjacentDelegationMaps, optimizeDelegationMap } from './delegationPlanOptimize.js';
import { getFieldsNotInSubschema } from './getFieldsNotInSubschema.js';
import {
  memoizeDelegationPlanBuilder,
  parentFieldPresenceKey,
} from './memoizeDelegationPlanBuilder.js';

export { coalesceAdjacentDelegationMaps, optimizeDelegationMap } from './delegationPlanOptimize.js';

function calculateDelegationStage(
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschemas: Array<Subschema>,
  targetSubschemas: Array<Subschema>,
  fieldNodes: Array<FieldNode>,
  fragments: Record<string, FragmentDefinitionNode>,
  context: any | undefined,
  info: GraphQLResolveInfo | undefined,
  stitchingInfo: StitchingInfo | undefined,
  /**
   * Initial sources for this plan. Their full schemas count as available.
   * Later-stage sources only contribute fields listed in
   * `fetchedFieldsByPath` (what prior stages actually selected), keyed by
   * object path so nested objects of the same type do not share presence.
   */
  initialSourceSubschemas: Array<Subschema> = sourceSubschemas,
  fetchedFieldsByPath: Map<string, Set<string>> = new Map(),
): {
  delegationMap: Map<Subschema, SelectionSetNode>;
  proxiableSubschemas: Array<Subschema>;
  nonProxiableSubschemas: Array<Subschema>;
  unproxiableFieldNodes: Array<FieldNode>;
} {
  const {
    selectionSets,
    entryPointSelectionSets,
    fieldSelectionSets,
    uniqueFields,
    nonUniqueFields,
  } = mergedTypeInfo;

  // Type-level merge-key only; field @requires checked per field below.
  // Multi-entryPoints: proxiable when *any* entry's keys are already available
  // (not all - that would break multi-key federation).
  const proxiableSubschemas: Array<Subschema> = [];
  const nonProxiableSubschemas: Array<Subschema> = [];

  for (const t of targetSubschemas) {
    const entrySels = entryPointSelectionSets?.get(t);
    if (entrySels != null && entrySels.length > 0) {
      const anyAvailable = entrySels.some(selectionSet =>
        subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemas, selectionSet),
      );
      if (anyAvailable) {
        proxiableSubschemas.push(t);
      } else {
        nonProxiableSubschemas.push(t);
      }
      continue;
    }
    const selectionSet = selectionSets.get(t);
    if (
      selectionSet != null &&
      !subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemas, selectionSet)
    ) {
      nonProxiableSubschemas.push(t);
    } else {
      proxiableSubschemas.push(t);
    }
  }

  const unproxiableFieldNodes: Array<FieldNode> = [];

  function fieldRequiresSatisfied(target: Subschema, fieldName: string): boolean {
    const fieldSelectionSet = fieldSelectionSets.get(target)?.[fieldName];
    if (fieldSelectionSet == null) {
      return true;
    }
    return selectionSetAvailableCloneLess(
      mergedTypeInfo,
      initialSourceSubschemas,
      fetchedFieldsByPath,
      fieldSelectionSet,
      mergedTypeInfo.typeName,
      '',
    );
  }

  function deferField(fieldNode: FieldNode, target?: Subschema): void {
    unproxiableFieldNodes.push(fieldNode);
    if (target != null && !nonProxiableSubschemas.includes(target)) {
      nonProxiableSubschemas.push(target);
    }
  }

  const delegationMap: Map<Subschema, SelectionSetNode> = new Map();

  /**
   * Schedule @requires selections for a deferred computed field so the next
   * stage can re-enter once deps are fetched (multi-stage).
   */
  function scheduleRequiresFetch(target: Subschema, fieldName: string): void {
    const req = fieldSelectionSets.get(target)?.[fieldName];
    if (req == null) {
      return;
    }
    for (const selection of req.selections) {
      if (selection.kind !== Kind.FIELD) {
        continue;
      }
      const depName = selection.name.value;
      if (depName === '__typename') {
        continue;
      }
      // Already fetched or scheduled in a prior stage - do not reschedule or
      // the plan loop never drains (nested requires still look unsatisfied
      // until parent seeding after execution).
      if (fetchedFieldsByPath.get('')?.has(depName)) {
        continue;
      }
      // Only expand deps that already live on the initial source schema
      // (@external). Missing-from-source deps are already injected into
      // fieldsNotInSubschema via fieldNodesByField; re-scheduling those
      // (e.g. author for byNovice) races computed hops ahead of nested
      // requires resolution.
      const onInitialSource = initialSourceSubschemas.some(s => {
        const t = s.transformedSchema.getType(mergedTypeInfo.typeName);
        return (isObjectType(t) || isInterfaceType(t)) && t.getFields()[depName] != null;
      });
      if (!onInitialSource) {
        continue;
      }
      if (
        selectionSetAvailableCloneLess(
          mergedTypeInfo,
          initialSourceSubschemas,
          fetchedFieldsByPath,
          { kind: Kind.SELECTION_SET, selections: [selection] },
          mergedTypeInfo.typeName,
          '',
        )
      ) {
        continue;
      }
      const unique = uniqueFields[depName];
      const nonUnique = nonUniqueFields[depName];
      const candidates: Array<Subschema> = [];
      if (unique != null) {
        candidates.push(unique);
      } else if (nonUnique != null) {
        candidates.push(...nonUnique);
      }
      const provider =
        candidates.find(s => s !== target && proxiableSubschemas.includes(s)) ??
        candidates.find(s => proxiableSubschemas.includes(s)) ??
        candidates.find(s => s !== target) ??
        candidates[0];
      if (provider == null) {
        continue;
      }
      const entrySels = entryPointSelectionSets?.get(provider);
      if (entrySels != null && entrySels.length > 0) {
        if (
          !entrySels.some(selectionSet =>
            subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemas, selectionSet),
          )
        ) {
          continue;
        }
      } else {
        const typeSelectionSet = selectionSets.get(provider);
        if (
          typeSelectionSet != null &&
          !subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemas, typeSelectionSet)
        ) {
          continue;
        }
      }
      const existing = delegationMap.get(provider);
      if (existing != null) {
        (existing.selections as SelectionNode[]).push(selection);
      } else {
        delegationMap.set(provider, {
          kind: Kind.SELECTION_SET,
          selections: [selection],
        });
      }
    }
  }

  // 2. for each selection:

  let overriddenOverall = false;
  const pinnedOverrideFields = new Set<string>();
  for (const fieldNode of fieldNodes) {
    const fieldName = fieldNode.name.value;
    if (fieldName === '__typename') {
      continue;
    }

    // Circular @requires: when every initial source still has unsatisfied
    // field deps for this field, defer and retry via leftover.
    const sourcesWithUnsatisfiedDependencies = initialSourceSubschemas.filter(s => {
      const req = fieldSelectionSets.get(s)?.[fieldName];
      if (req == null) {
        return false;
      }
      return !selectionSetAvailableCloneLess(
        mergedTypeInfo,
        initialSourceSubschemas,
        fetchedFieldsByPath,
        req,
        mergedTypeInfo.typeName,
        '',
      );
    });
    if (sourcesWithUnsatisfiedDependencies.length === sourceSubschemas.length) {
      unproxiableFieldNodes.push(fieldNode);
      for (const source of sourcesWithUnsatisfiedDependencies) {
        if (!nonProxiableSubschemas.includes(source)) {
          nonProxiableSubschemas.push(source);
        }
      }
      continue;
    }

    // 2a. use uniqueFields map to assign fields to subschema if one of possible subschemas

    const uniqueSubschema = uniqueFields[fieldName];
    if (uniqueSubschema != null) {
      if (!proxiableSubschemas.includes(uniqueSubschema)) {
        deferField(fieldNode, uniqueSubschema);
        continue;
      }
      if (!fieldRequiresSatisfied(uniqueSubschema, fieldName)) {
        scheduleRequiresFetch(uniqueSubschema, fieldName);
        deferField(fieldNode, uniqueSubschema);
        continue;
      }

      const existingSubschema = delegationMap.get(uniqueSubschema)?.selections as SelectionNode[];
      if (existingSubschema != null) {
        existingSubschema.push(fieldNode);
      } else {
        delegationMap.set(uniqueSubschema, {
          kind: Kind.SELECTION_SET,
          selections: [fieldNode],
        });
      }

      continue;
    }

    // 2b. use nonUniqueFields to assign to a possible subschema,
    //     preferring one of the subschemas already targets of delegation
    let nonUniqueSubschemas = nonUniqueFields[fieldNode.name.value];
    if (nonUniqueSubschemas == null) {
      unproxiableFieldNodes.push(fieldNode);
      continue;
    }

    nonUniqueSubschemas = nonUniqueSubschemas.filter(
      s => proxiableSubschemas.includes(s) && fieldRequiresSatisfied(s, fieldName),
    );
    if (!nonUniqueSubschemas.length) {
      // Candidates that failed only on field-requires stay non-proxiable so a
      // later stage can retry after deps land (self-target computed re-entry).
      const requireDeferred = nonUniqueFields[fieldNode.name.value]!.filter(s =>
        proxiableSubschemas.includes(s),
      );
      if (requireDeferred.length) {
        for (const t of requireDeferred) {
          scheduleRequiresFetch(t, fieldName);
          if (!nonProxiableSubschemas.includes(t)) {
            nonProxiableSubschemas.push(t);
          }
        }
      }
      unproxiableFieldNodes.push(fieldNode);
      continue;
    }

    let existingSubschema = nonUniqueSubschemas.find(s => delegationMap.has(s));

    let overridden = false;
    for (const nonUniqueSubschema of nonUniqueSubschemas) {
      if (context != null && info != null) {
        const overrideHandler =
          nonUniqueSubschema.merge?.[mergedTypeInfo.typeName]?.fields?.[fieldNode.name.value]
            ?.override;
        if (overrideHandler != null) {
          const overriddenBySubschema = handleOverrideByDelegation(info, context, overrideHandler);
          if (overriddenBySubschema) {
            let subschemaSelections = delegationMap.get(nonUniqueSubschema);
            if (subschemaSelections == null) {
              subschemaSelections = {
                kind: Kind.SELECTION_SET,
                selections: [],
              };
              delegationMap.set(nonUniqueSubschema, subschemaSelections);
            }
            (subschemaSelections.selections as SelectionNode[]).push(fieldNode);
            pinnedOverrideFields.add(fieldNode.name.value);
            overridden = true;
            break;
          } else {
            existingSubschema = undefined;
            overriddenOverall = true;
          }
        }
      }
    }

    if (existingSubschema != null) {
      if (!overridden) {
        // It is okay we previously explicitly check whether the map has the element.
        (delegationMap.get(existingSubschema)!.selections as SelectionNode[]).push(fieldNode);
      }
    } else {
      let bestUniqueSubschema = nonUniqueSubschemas[0];
      let bestScore = Infinity;
      for (const nonUniqueSubschema of nonUniqueSubschemas) {
        const typeInSubschema = nonUniqueSubschema.transformedSchema.getType(
          mergedTypeInfo.typeName,
        ) as GraphQLObjectType;
        const fields = typeInSubschema.getFields();
        const field = fields[fieldNode.name.value];
        if (field != null) {
          if (context != null && info != null) {
            const overrideHandler =
              nonUniqueSubschema.merge?.[mergedTypeInfo.typeName]?.fields?.[fieldNode.name.value]
                ?.override;
            if (overrideHandler != null) {
              const overridden = handleOverrideByDelegation(info, context, overrideHandler);
              if (overridden) {
                bestUniqueSubschema = nonUniqueSubschema;
                break;
              } else {
                continue;
              }
            }
          }
          const unavailableFields = extractUnavailableFields(
            nonUniqueSubschema.transformedSchema,
            field,
            fieldNode,
            fieldType => {
              if (!nonUniqueSubschema.merge?.[fieldType.name]) {
                let nonUniqueSubschemaSelections =
                  // We have to cast it to `SelectionNode[]` because it is Readonly<SelectionNode[]> and it doesn't allow us to push new elements.
                  delegationMap.get(nonUniqueSubschema)?.selections as SelectionNode[];
                if (nonUniqueSubschemaSelections == null) {
                  nonUniqueSubschemaSelections = [];
                  delegationMap.set(nonUniqueSubschema, {
                    kind: Kind.SELECTION_SET,
                    selections: nonUniqueSubschemaSelections,
                  });
                }
                nonUniqueSubschemaSelections.push(fieldNode);
                // Ignore unresolvable fields
                return false;
              }
              return true;
            },
          );
          const currentScore = calculateSelectionScore(unavailableFields, fragments);
          if (currentScore < bestScore) {
            bestScore = currentScore;
            bestUniqueSubschema = nonUniqueSubschema;
          }
        }
      }
      const existingSelections = delegationMap.get(bestUniqueSubschema!);
      if (existingSelections != null) {
        (existingSelections.selections as SelectionNode[]).push(fieldNode);
      } else {
        delegationMap.set(bestUniqueSubschema!, {
          kind: Kind.SELECTION_SET,
          selections: [fieldNode],
        });
      }
    }
  }

  // Accepted overrides pin their fields to the chosen target; still allow
  // ordinary coalescing of other fields when no override rejected a candidate.
  if (delegationMap.size > 1 && !overriddenOverall) {
    optimizeDelegationMap(
      delegationMap,
      mergedTypeInfo.typeName,
      fragments,
      stitchingInfo,
      pinnedOverrideFields.size ? pinnedOverrideFields : undefined,
    );
  }

  return {
    delegationMap,
    proxiableSubschemas,
    nonProxiableSubschemas,
    unproxiableFieldNodes,
  };
}

export const calculateSelectionScore = memoize2(function calculateSelectionScore(
  selections: readonly SelectionNode[],
  fragments: Record<string, FragmentDefinitionNode>,
): number {
  let score = 0;
  for (const selectionNode of selections) {
    switch (selectionNode.kind) {
      case Kind.FIELD:
        score++;
        if (selectionNode.selectionSet?.selections) {
          score += calculateSelectionScore(selectionNode.selectionSet.selections, fragments);
        }
        break;
      case Kind.INLINE_FRAGMENT:
        score += calculateSelectionScore(selectionNode.selectionSet.selections, fragments);
        break;
      case Kind.FRAGMENT_SPREAD:
        const fragment = fragments?.[selectionNode.name.value];
        if (fragment) {
          score += calculateSelectionScore(fragment.selectionSet.selections, fragments);
        }
        break;
    }
  }
  return score;
});

function getStitchingInfo(schema: GraphQLSchema): StitchingInfo {
  const stitchingInfo = schema.extensions?.stitchingInfo as StitchingInfo | undefined;
  if (!stitchingInfo) {
    throw new Error(`Schema is not a stitched schema.`);
  }
  return stitchingInfo;
}

export function createDelegationPlanBuilder(mergedTypeInfo: MergedTypeInfo): DelegationPlanBuilder {
  mergedTypeInfo.nonMemoizedDelegationPlanBuilder = function delegationPlanBuilder(
    schema: GraphQLSchema,
    sourceSubschema: Subschema<any, any, any, any>,
    variableValues: Record<string, any>,
    fragments: Record<string, FragmentDefinitionNode>,
    fieldNodes: FieldNode[],
    context?: any,
    info?: GraphQLResolveInfo,
    parent?: any,
  ): Array<Map<Subschema, SelectionSetNode>> {
    const stitchingInfo = getStitchingInfo(schema);
    const targetSubschemas = mergedTypeInfo?.targetSubschemas.get(sourceSubschema);
    if (!targetSubschemas || !targetSubschemas.length) {
      return [];
    }

    const typeName = mergedTypeInfo.typeName;
    const typeInSubschema = sourceSubschema.transformedSchema.getType(
      typeName,
    ) as GraphQLCompositeType;

    let providedSelectionNode: SelectionSetNode | undefined;

    const parentFieldName = fieldNodes[0]?.name.value;

    if (info?.parentType && parentFieldName) {
      const providedSelectionsByField =
        stitchingInfo.mergedTypes[info.parentType.name]?.providedSelectionsByField?.get(
          sourceSubschema,
        );
      providedSelectionNode = providedSelectionsByField?.[parentFieldName];
    }

    const fieldsNotInSubschema = getFieldsNotInSubschema(
      schema,
      stitchingInfo,
      schema.getType(typeName) as GraphQLCompositeType,
      mergedTypeInfo.typeMaps.get(sourceSubschema)?.[typeName] as GraphQLCompositeType,
      fieldNodes,
      fragments,
      variableValues,
      sourceSubschema,
      providedSelectionNode,
      context,
      info,
    );

    if (!fieldsNotInSubschema.length) {
      return [];
    }

    let delegationMaps: Array<Map<Subschema, SelectionSetNode>> = [];
    let sourceSubschemas = createSubschemas(sourceSubschema);
    const initialSourceSubschemas = sourceSubschemas;
    const fetchedFieldsByPath: Map<string, Set<string>> = new Map();
    // Fields already on the ExternalObject count as fetched.
    if (parent != null) {
      seedFetchedFieldsFromParent(
        fetchedFieldsByPath,
        '',
        typeName,
        parent,
        mergedTypeInfo,
        schema,
      );
    }

    let delegationStage = calculateDelegationStage(
      mergedTypeInfo,
      sourceSubschemas,
      targetSubschemas,
      fieldsNotInSubschema,
      fragments,
      context,
      info,
      stitchingInfo,
      initialSourceSubschemas,
      fetchedFieldsByPath,
    );
    let { delegationMap } = delegationStage;
    while (delegationMap.size) {
      delegationMaps.push(delegationMap);
      recordFetchedFields(
        fetchedFieldsByPath,
        '',
        mergedTypeInfo.typeName,
        delegationMap,
        fragments,
        mergedTypeInfo,
        stitchingInfo,
      );

      const { proxiableSubschemas, nonProxiableSubschemas, unproxiableFieldNodes } =
        delegationStage;

      sourceSubschemas = combineSubschemas(sourceSubschemas, proxiableSubschemas);

      delegationStage = calculateDelegationStage(
        mergedTypeInfo,
        sourceSubschemas,
        nonProxiableSubschemas,
        unproxiableFieldNodes,
        fragments,
        context,
        info,
        stitchingInfo,
        initialSourceSubschemas,
        fetchedFieldsByPath,
      );
      delegationMap = delegationStage.delegationMap;
    }
    if (
      isAbstractType(typeInSubschema) &&
      fieldsNotInSubschema.some(fieldNode => fieldNode.name.value === '__typename')
    ) {
      const fragmentSelections: SelectionNode[] = [];
      for (const fieldNode of fieldNodes) {
        if (fieldNode.selectionSet) {
          for (const selection of fieldNode.selectionSet.selections) {
            if (
              selection.kind === Kind.INLINE_FRAGMENT ||
              selection.kind === Kind.FRAGMENT_SPREAD
            ) {
              fragmentSelections.push(selection);
            }
          }
        }
      }
      const implementedSubschemas = targetSubschemas.filter(subschema => {
        const typeInTargetSubschema = mergedTypeInfo.typeMaps.get(subschema)?.[typeName];
        return (
          isAbstractType(typeInTargetSubschema) &&
          subschema.transformedSchema.getPossibleTypes(typeInTargetSubschema).length
        );
      });
      let added = false;
      for (const implementedSubgraphs of implementedSubschemas) {
        for (const delegationMap of delegationMaps) {
          // SelectionNode is not read-only
          const existingSelections = delegationMap.get(implementedSubgraphs)
            ?.selections as SelectionNode[];
          if (existingSelections) {
            existingSelections.push({
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: '__typename',
              },
            });
            existingSelections.push(...fragmentSelections);
            added = true;
            break;
          }
          if (added) {
            break;
          }
        }
      }
      if (!added) {
        const subschemaWithTypeName = implementedSubschemas[0];
        if (subschemaWithTypeName) {
          const delegationStageToFetchTypeName: Map<Subschema, SelectionSetNode> = new Map();
          delegationStageToFetchTypeName.set(subschemaWithTypeName, {
            kind: Kind.SELECTION_SET,
            selections: [
              {
                kind: Kind.FIELD,
                name: {
                  kind: Kind.NAME,
                  value: '__typename',
                },
              },
              ...fragmentSelections,
            ],
          });
          delegationMaps.push(delegationStageToFetchTypeName);
        }
      }
    }

    delegationMaps = coalesceAdjacentDelegationMaps(delegationMaps, typeName, stitchingInfo);

    if (
      delegationStage.unproxiableFieldNodes.length &&
      delegationStage.nonProxiableSubschemas.length
    ) {
      leftOverByDelegationPlan.set(delegationMaps, {
        unproxiableFieldNodes: delegationStage.unproxiableFieldNodes,
        nonProxiableSubschemas: delegationStage.nonProxiableSubschemas,
        missingFieldsParentMap: new Map(),
        missingFieldsParentDeferredMap: new Map(),
      });
    }
    return delegationMaps;
  };

  // Always memoize. Types without @requires/computed ignore parent (seed key
  // ''). Types with fieldSelectionSets include a parent field-presence
  // fingerprint so list entities with the same shape still hit the cache
  // while requires stay correct. Progressive override still
  // forces non-memoized via stitchingInfo.
  const dependsOnParent = mergedTypePlanDependsOnParent(mergedTypeInfo);
  return memoizeDelegationPlanBuilder(
    mergedTypeInfo.nonMemoizedDelegationPlanBuilder,
    dependsOnParent ? parentFieldPresenceKey : () => '',
  );
}

function mergedTypePlanDependsOnParent(mergedTypeInfo: MergedTypeInfo): boolean {
  for (const fieldMap of mergedTypeInfo.fieldSelectionSets.values()) {
    if (fieldMap != null && Object.keys(fieldMap).length > 0) {
      return true;
    }
  }
  return false;
}

function joinObjectPath(parentPath: string, segment: string): string {
  return parentPath ? `${parentPath}.${segment}` : segment;
}

function seedFetchedFieldsFromParent(
  fetchedFieldsByPath: Map<string, Set<string>>,
  objectPath: string,
  typeName: string,
  parent: any,
  mergedTypeInfo: MergedTypeInfo,
  schema: GraphQLSchema,
): void {
  if (parent == null || typeof parent !== 'object') {
    return;
  }
  let set = fetchedFieldsByPath.get(objectPath);
  if (!set) {
    set = new Set();
    fetchedFieldsByPath.set(objectPath, set);
  }
  for (const key of Object.keys(parent) as string[]) {
    if (key.startsWith('_') && key !== '__typename') {
      continue;
    }
    set.add(key);
  }
  for (const key of Object.keys(parent) as string[]) {
    if (key.startsWith('_') && key !== '__typename') {
      continue;
    }
    const value = parent[key];
    if (value == null || typeof value !== 'object') {
      continue;
    }
    const declared = resolveSeedFieldTypeName(typeName, key, mergedTypeInfo, schema);
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item != null && typeof item === 'object') {
          const itemType =
            (typeof item.__typename === 'string' ? item.__typename : undefined) ?? declared;
          if (itemType) {
            seedFetchedFieldsFromParent(
              fetchedFieldsByPath,
              joinObjectPath(objectPath, `${key}.${index}`),
              itemType,
              item,
              mergedTypeInfo,
              schema,
            );
          }
        }
      });
    } else {
      const childType =
        (typeof value.__typename === 'string' ? value.__typename : undefined) ?? declared;
      if (childType) {
        seedFetchedFieldsFromParent(
          fetchedFieldsByPath,
          joinObjectPath(objectPath, key),
          childType,
          value,
          mergedTypeInfo,
          schema,
        );
      }
    }
  }
}

function resolveSeedFieldTypeName(
  typeName: string,
  fieldName: string,
  mergedTypeInfo: MergedTypeInfo,
  schema: GraphQLSchema,
): string | undefined {
  const fromSchema = schema.getType(typeName);
  if (isObjectType(fromSchema) || isInterfaceType(fromSchema)) {
    const field = fromSchema.getFields()[fieldName];
    if (field) {
      return getNamedType(field.type).name;
    }
  }
  for (const typeMap of mergedTypeInfo.typeMaps.values()) {
    const t = typeMap[typeName];
    if (!isObjectType(t) && !isInterfaceType(t)) {
      continue;
    }
    const field = t.getFields()[fieldName];
    if (field) {
      return getNamedType(field.type).name;
    }
  }
  return undefined;
}

const createSubschemas = memoize1(function createSubschemas(
  sourceSubschema: Subschema,
): Array<Subschema> {
  return [sourceSubschema];
});

const combineSubschemas = memoize2(function combineSubschemas(
  sourceSubschemas: Array<Subschema>,
  additionalSubschemas: Array<Subschema>,
): Array<Subschema> {
  return sourceSubschemas.concat(additionalSubschemas);
});

const subschemaTypesContainSelectionSet = memoize3(function subschemaTypesContainSelectionSet(
  mergedTypeInfo: MergedTypeInfo,
  sourceSubchemas: Array<Subschema>,
  selectionSet: SelectionSetNode,
) {
  return typesContainSelectionSet(
    sourceSubchemas.map(
      sourceSubschema =>
        sourceSubschema.transformedSchema.getType(mergedTypeInfo.typeName) as GraphQLCompositeType,
    ),
    selectionSet,
  );
});

function getFieldsFromCompositeType(type: GraphQLCompositeType): GraphQLFieldMap<any, any> {
  if (isObjectType(type) || isInterfaceType(type)) {
    return type.getFields();
  }
  if (isUnionType(type)) {
    // Merge member field maps so merge-key checks like `{ id }` succeed when
    // a stub member (e.g. StubMajor) carries the key field.
    const fields: GraphQLFieldMap<any, any> = Object.create(null);
    for (const member of type.getTypes()) {
      Object.assign(fields, member.getFields());
    }
    return fields;
  }
  return Object.create(null);
}

function typesContainSelectionSet(
  types: Array<GraphQLCompositeType>,
  selectionSet: SelectionSetNode,
): boolean {
  const fieldMaps = types.map(type => getFieldsFromCompositeType(type));

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const fields = fieldMaps
        .map(fieldMap => fieldMap[selection.name.value])
        .filter(field => field != null);
      if (!fields.length) {
        return false;
      }

      if (selection.selectionSet != null) {
        if (
          !typesContainSelectionSet(
            fields.map(field => getNamedType(field.type) as GraphQLCompositeType),
            selection.selectionSet,
          )
        ) {
          return false;
        }
      }
    } else if (
      selection.kind === Kind.INLINE_FRAGMENT &&
      selection.typeCondition?.name.value === types[0]?.name
    ) {
      if (!typesContainSelectionSet(types, selection.selectionSet)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * @requires availability: fields on the *initial* source schemas
 * count as present (object came from there), plus fields prior plan stages
 * actually selected. Later-stage sibling fields on the same Subschema do not
 * count until fetched.
 */
function fetchedSetAtPath(
  fetchedFieldsByPath: Map<string, Set<string>>,
  objectPath: string,
): Set<string> | undefined {
  const direct = fetchedFieldsByPath.get(objectPath);
  if (direct) {
    return direct;
  }
  // List-item paths seeded from a parent (field.0, field.1, ...): a nested
  // requires selection is only available when every seeded item has the field.
  return undefined;
}

function listItemPaths(
  fetchedFieldsByPath: Map<string, Set<string>>,
  parentPath: string,
  fieldName: string,
): string[] {
  const prefix = joinObjectPath(parentPath, fieldName) + '.';
  const paths: string[] = [];
  for (const path of fetchedFieldsByPath.keys()) {
    if (!path.startsWith(prefix)) {
      continue;
    }
    const rest = path.slice(prefix.length);
    const first = rest.split('.')[0] ?? '';
    if (/^\d+$/.test(first)) {
      const itemPath = prefix + first;
      if (!paths.includes(itemPath)) {
        paths.push(itemPath);
      }
    }
  }
  return paths;
}

function selectionSetAvailableCloneLess(
  mergedTypeInfo: MergedTypeInfo,
  initialSourceSubschemas: Array<Subschema>,
  fetchedFieldsByPath: Map<string, Set<string>>,
  selectionSet: SelectionSetNode,
  typeName: string,
  objectPath: string,
): boolean {
  // Initial-source schema fields only count on the plan's root merged type
  // (the object we started from). Nested requires (author { yearsOfExperience })
  // must be covered by fetchedFieldsByPath at the specific object path —
  // otherwise A's Author schema would make yearsOfExperience look present
  // before it is fetched, and sibling objects of the same type would share
  // presence incorrectly.
  const useInitialSchema = objectPath === '' && typeName === mergedTypeInfo.typeName;
  const initialFieldMaps = useInitialSchema
    ? initialSourceSubschemas.map(s => {
        const t = s.transformedSchema.getType(typeName);
        return isObjectType(t) || isInterfaceType(t) ? t.getFields() : null;
      })
    : [];
  const fetched = fetchedSetAtPath(fetchedFieldsByPath, objectPath);

  for (const selection of selectionSet.selections) {
    if (selection.kind !== Kind.FIELD) {
      if (
        selection.kind === Kind.INLINE_FRAGMENT &&
        (selection.typeCondition == null || selection.typeCondition.name.value === typeName)
      ) {
        if (
          !selectionSetAvailableCloneLess(
            mergedTypeInfo,
            initialSourceSubschemas,
            fetchedFieldsByPath,
            selection.selectionSet,
            typeName,
            objectPath,
          )
        ) {
          return false;
        }
      }
      continue;
    }
    const fieldName = selection.name.value;
    if (fieldName === '__typename') {
      continue;
    }
    // Schema presence is not enough for deferred computed fields: the defer
    // transform strips them from the initial request, so they are not on the
    // parent until a later merge hop fetches them.
    const onInitial = initialFieldMaps.some((fm, i) => {
      if (fm?.[fieldName] == null) {
        return false;
      }
      const source = initialSourceSubschemas[i];
      const mergeFields = source?.merge?.[typeName]?.fields;
      if (mergeFields?.[fieldName]?.computed) {
        return false;
      }
      return true;
    });
    const onFetched = fetched?.has(fieldName) === true;
    if (!onInitial && !onFetched) {
      return false;
    }
    if (selection.selectionSet != null) {
      let nestedTypeName: string | undefined;
      for (const s of initialSourceSubschemas) {
        const t = s.transformedSchema.getType(typeName);
        if (!isObjectType(t) && !isInterfaceType(t)) {
          continue;
        }
        const field = t.getFields()[fieldName];
        if (field) {
          nestedTypeName = getNamedType(field.type).name;
          break;
        }
      }
      if (!nestedTypeName) {
        for (const typeMap of mergedTypeInfo.typeMaps.values()) {
          const t = typeMap[typeName];
          if (!isObjectType(t) && !isInterfaceType(t)) {
            continue;
          }
          const field = t.getFields()[fieldName];
          if (field) {
            nestedTypeName = getNamedType(field.type).name;
            break;
          }
        }
      }
      if (!nestedTypeName) {
        continue;
      }
      const childPath = joinObjectPath(objectPath, fieldName);
      const itemPaths = listItemPaths(fetchedFieldsByPath, objectPath, fieldName);
      if (itemPaths.length) {
        if (
          !itemPaths.every(itemPath =>
            selectionSetAvailableCloneLess(
              mergedTypeInfo,
              initialSourceSubschemas,
              fetchedFieldsByPath,
              selection.selectionSet!,
              nestedTypeName!,
              itemPath,
            ),
          )
        ) {
          return false;
        }
      } else if (
        !selectionSetAvailableCloneLess(
          mergedTypeInfo,
          initialSourceSubschemas,
          fetchedFieldsByPath,
          selection.selectionSet,
          nestedTypeName,
          childPath,
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

function recordFetchedFields(
  fetchedFieldsByPath: Map<string, Set<string>>,
  objectPath: string,
  typeName: string,
  delegationMap: Map<Subschema, SelectionSetNode>,
  fragments: Record<string, FragmentDefinitionNode>,
  mergedTypeInfo: MergedTypeInfo,
  stitchingInfo: StitchingInfo,
): void {
  // Deep-record nested fields only when this subschema owns them. External
  // nested fields (author { yearsOfExperience } from B) must not count as
  // fetched until a later hop - otherwise byNovice stages too early.
  // Owned nested fields (data { foo } from A) do count so requirer can share
  // the same mergeFields promiseReduce before inaccessible nulling.
  for (const [subschema, selectionSet] of delegationMap) {
    collectFetchedFieldsDeep(
      fetchedFieldsByPath,
      objectPath,
      typeName,
      selectionSet,
      fragments,
      mergedTypeInfo,
      subschema,
      stitchingInfo,
    );
  }
}

function subschemaOwnsField(
  stitchingInfo: StitchingInfo,
  typeName: string,
  fieldName: string,
  subschema: Subschema,
): boolean {
  if (fieldName === '__typename') {
    return true;
  }
  const mti = stitchingInfo.mergedTypes[typeName];
  if (mti == null) {
    // Non-merged nested type: treat schema presence as ownership.
    const t = subschema.transformedSchema.getType(typeName);
    return (isObjectType(t) || isInterfaceType(t)) && t.getFields()[fieldName] != null;
  }
  const unique = mti.uniqueFields[fieldName];
  if (unique != null) {
    return unique === subschema;
  }
  const nonUnique = mti.nonUniqueFields[fieldName];
  if (nonUnique != null) {
    return nonUnique.includes(subschema);
  }
  // Field only used via @requires / not in ownership maps - schema presence.
  const t = subschema.transformedSchema.getType(typeName);
  return (isObjectType(t) || isInterfaceType(t)) && t.getFields()[fieldName] != null;
}

function collectFetchedFieldsDeep(
  fetchedFieldsByPath: Map<string, Set<string>>,
  objectPath: string,
  typeName: string,
  selectionSet: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>,
  mergedTypeInfo: MergedTypeInfo,
  subschema: Subschema,
  stitchingInfo: StitchingInfo,
): void {
  let set = fetchedFieldsByPath.get(objectPath);
  if (!set) {
    set = new Set();
    fetchedFieldsByPath.set(objectPath, set);
  }
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const fieldName = selection.name.value;
      const owned = subschemaOwnsField(stitchingInfo, typeName, fieldName, subschema);
      if (owned) {
        set.add(fieldName);
      }
      if (selection.selectionSet == null || fieldName === '__typename') {
        continue;
      }
      const nestedTypeName = resolveSeedFieldTypeName(
        typeName,
        fieldName,
        mergedTypeInfo,
        subschema.transformedSchema,
      );
      if (nestedTypeName) {
        collectFetchedFieldsDeep(
          fetchedFieldsByPath,
          joinObjectPath(objectPath, fieldName),
          nestedTypeName,
          selection.selectionSet,
          fragments,
          mergedTypeInfo,
          subschema,
          stitchingInfo,
        );
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      collectFetchedFieldsDeep(
        fetchedFieldsByPath,
        objectPath,
        selection.typeCondition?.name.value ?? typeName,
        selection.selectionSet,
        fragments,
        mergedTypeInfo,
        subschema,
        stitchingInfo,
      );
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const frag = fragments[selection.name.value];
      if (frag) {
        collectFetchedFieldsDeep(
          fetchedFieldsByPath,
          objectPath,
          frag.typeCondition.name.value,
          frag.selectionSet,
          fragments,
          mergedTypeInfo,
          subschema,
          stitchingInfo,
        );
      }
    }
  }
}
