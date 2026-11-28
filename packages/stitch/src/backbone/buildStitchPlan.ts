import {
  getNamedType,
  isAbstractType,
  isInterfaceType,
  isLeafType,
  isObjectType,
  isUnionType,
  Kind,
  valueFromASTUntyped,
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLInterfaceType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type GraphQLUnionType,
  type OperationDefinitionNode,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import type { StitchingInfo, Subschema } from '@graphql-tools/delegate';
import { handleOverrideByDelegation, leftOverByDelegationPlan } from '@graphql-tools/delegate';
import { getDefinedRootType } from '@graphql-tools/utils';
import { isLocalField } from './localFields.js';
import { getBatchedMergeEntry, inferMergeArgName } from './mergeEntry.js';
import { buildPlanSchedule, collectExecutableHops, planHasCondition } from './planSchedule.js';
import { flattenPlanControlFlow } from './planShape.js';
import { preparePlanDocuments } from './preparePlanDocuments.js';
import { orRunIf, runIfKey } from './runIf.js';
import type { PathSegment, StitchPlan, StitchPlanNode } from './types.js';

/**
 * Aggressive (earliest-wave) fold only kicks in when the plan still has many
 * foldable entity hops after the safe exact-dependsOn pass. Federation-example
 * TestQuery stays under this threshold so continuous dispatch is preserved;
 * planning-large (100+ hops) gets earliest-wave coalesce.
 */
const AGGRESSIVE_WAVE_FOLD_MIN_ENTITY_HOPS = 16;

function selectionSetOf(selections: readonly SelectionNode[]): SelectionSetNode {
  return { kind: Kind.SELECTION_SET, selections: [...selections] };
}

/** Same key fusion sets on request context with per-request active labels. */
const OVERRIDE_LABELS_CONTEXT_KEY = Symbol.for('hive.gateway.overrideLabels');

/**
 * Labels-only bag for the in-flight `buildStitchPlan` call. Progressive-override
 * / delegationPlanBuilder handlers see this instead of full request context.
 */
let planningContext: any;

/**
 * Fill omitted operation variables from their GraphQL default values so
 * `@skip`/`@include` and collectFields can evaluate without throwing.
 */
export function coerceOperationVariables(
  operation: OperationDefinitionNode,
  variableValues: Record<string, any>,
): Record<string, any> {
  const out: Record<string, any> = { ...variableValues };
  for (const def of operation.variableDefinitions ?? []) {
    const name = def.variable.name.value;
    if (out[name] === undefined && def.defaultValue != null) {
      out[name] = valueFromASTUntyped(def.defaultValue, out);
    }
  }
  // Drop remaining undefined entries (Yoga may inject them).
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) {
      delete out[key];
    }
  }
  return out;
}

function ensureTypename(selectionSet: SelectionSetNode): SelectionSetNode {
  const hasTypename = selectionSet.selections.some(
    sel => sel.kind === Kind.FIELD && sel.name.value === '__typename',
  );
  if (hasTypename) {
    return selectionSet;
  }
  return selectionSetOf([
    {
      kind: Kind.FIELD,
      name: { kind: Kind.NAME, value: '__typename' },
    },
    ...selectionSet.selections,
  ]);
}

/** True when `owner` exposes the interface but not its concrete implementers. */
function isInterfaceObjectOwner(
  owner: Subschema,
  returnType: GraphQLInterfaceType | GraphQLUnionType,
  schema: GraphQLSchema,
): boolean {
  if (owner.transformedSchema.getType(returnType.name) == null) {
    return false;
  }
  if (!isInterfaceType(returnType) && !isUnionType(returnType)) {
    return false;
  }
  return schema
    .getPossibleTypes(returnType)
    .some(concrete => owner.transformedSchema.getType(concrete.name) == null);
}

/**
 * Prefer a target subgraph that defines at least one concrete implementer
 * (so entity resolution can replace interface-object __typename).
 */
function findConcreteImplementerSubschema(
  mergedTypeInfo: NonNullable<StitchingInfo['mergedTypes'][string]>,
  source: Subschema,
  returnType: GraphQLInterfaceType | GraphQLUnionType,
  schema: GraphQLSchema,
): Subschema | undefined {
  const targets = mergedTypeInfo.targetSubschemas.get(source) ?? [];
  const possibles = schema.getPossibleTypes(returnType);
  return targets.find(t => possibles.some(c => t.transformedSchema.getType(c.name) != null));
}

function rootTypeOf(schema: GraphQLSchema, operation: OperationDefinitionNode['operation']) {
  return operation === 'mutation'
    ? schema.getMutationType()
    : operation === 'subscription'
      ? schema.getSubscriptionType()
      : schema.getQueryType();
}

/**
 * Every Subschema known to stitching - `subschemaMap` holds the primary
 * entry; entry-point splits also appear on mergedTypes.
 */
function allKnownSubschemas(stitchingInfo: StitchingInfo): Subschema[] {
  const seen = new Set<Subschema>();
  const out: Subschema[] = [];
  const add = (s: Subschema | undefined | null) => {
    if (s != null && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  };
  for (const s of stitchingInfo.subschemaMap.values()) {
    add(s);
  }
  for (const typeName in stitchingInfo.mergedTypes) {
    const merged = stitchingInfo.mergedTypes[typeName];
    if (!merged) {
      continue;
    }
    for (const s of merged.selectionSets.keys()) {
      add(s);
    }
    if (merged.entryPointSelectionSets) {
      for (const s of merged.entryPointSelectionSets.keys()) {
        add(s);
      }
    }
    for (const s of merged.resolvers.keys()) {
      add(s);
    }
    for (const targets of merged.targetSubschemas.values()) {
      for (const s of targets) {
        add(s);
      }
    }
    for (const fieldName in merged.uniqueFields) {
      add(merged.uniqueFields[fieldName]);
    }
    for (const fieldName in merged.nonUniqueFields) {
      for (const s of merged.nonUniqueFields[fieldName] ?? []) {
        add(s);
      }
    }
  }
  return out;
}

function findOwningSubschemasForRootField(
  stitchingInfo: StitchingInfo,
  operation: OperationDefinitionNode['operation'],
  fieldName: string,
): Subschema[] {
  const transformedOwners: Subschema[] = [];
  const rawOnlyOwners: Subschema[] = [];
  const consider = (subschema: Subschema) => {
    const transformedRoot = rootTypeOf(subschema.transformedSchema, operation);
    if (transformedRoot?.getFields()[fieldName] != null) {
      transformedOwners.push(subschema);
      return;
    }
    // Fall back to raw when transforms drop a still-executable root field
    // (e.g. @interfaceObject).
    const rawRoot = rootTypeOf(subschema.schema, operation);
    if (rawRoot?.getFields()[fieldName] != null) {
      rawOnlyOwners.push(subschema);
    }
  };
  for (const subschema of stitchingInfo.subschemaMap.values()) {
    consider(subschema);
  }
  if (transformedOwners.length) {
    return transformedOwners;
  }
  // Entry-point splits may live only on mergedTypes - scan those next.
  const seen = new Set(stitchingInfo.subschemaMap.values());
  for (const subschema of allKnownSubschemas(stitchingInfo)) {
    if (seen.has(subschema)) {
      continue;
    }
    const transformedRoot = rootTypeOf(subschema.transformedSchema, operation);
    if (transformedRoot?.getFields()[fieldName] != null) {
      transformedOwners.push(subschema);
    }
  }
  if (transformedOwners.length) {
    return transformedOwners;
  }
  return rawOnlyOwners;
}

function fieldAvailableOnSubschema(
  subschema: Subschema,
  typeName: string,
  fieldName: string,
  providedFieldNames?: ReadonlySet<string>,
): boolean {
  if (fieldName === '__typename') {
    return true;
  }
  if (providedFieldNames?.has(fieldName)) {
    return true;
  }
  // Prefer transformedSchema; fall back to raw when the type is absent there.
  const transformed = subschema.transformedSchema.getType(typeName);
  if (transformed && 'getFields' in transformed) {
    return (transformed as GraphQLObjectType).getFields()[fieldName] != null;
  }
  const raw = subschema.schema.getType(typeName);
  if (raw && 'getFields' in raw) {
    return (raw as GraphQLObjectType).getFields()[fieldName] != null;
  }
  return false;
}

/** Merge two field nodes that share a response key (union nested selections). */
function mergeFieldNodes(existing: FieldNode, incoming: FieldNode): FieldNode {
  if (!incoming.selectionSet) {
    return existing.selectionSet ? existing : incoming;
  }
  if (!existing.selectionSet) {
    return incoming;
  }
  const seen = new Set<string>();
  const merged: SelectionNode[] = [];
  const push = (sel: SelectionNode) => {
    if (sel.kind === Kind.FIELD) {
      const key = sel.alias?.value ?? sel.name.value;
      const idx = merged.findIndex(
        m => m.kind === Kind.FIELD && (m.alias?.value ?? m.name.value) === key,
      );
      if (idx >= 0) {
        merged[idx] = mergeFieldNodes(merged[idx] as FieldNode, sel);
        return;
      }
      seen.add(key);
    }
    merged.push(sel);
  };
  for (const sel of existing.selectionSet.selections) {
    push(sel);
  }
  for (const sel of incoming.selectionSet.selections) {
    push(sel);
  }
  return {
    ...existing,
    selectionSet: selectionSetOf(merged),
    directives: existing.directives?.length ? existing.directives : incoming.directives,
  };
}

/**
 * Concrete types that may appear under `parentTypeName` on this subgraph.
 * Mirrors Hive QP FetchGraph: interface parents only list subgraph implementers;
 * union parents list subgraph members (even if they don't implement a sibling
 * interface locally - e.g. Product -> Oven on A for `... on Node { id }`).
 */
function concretesOnSubschema(
  subschema: Subschema,
  parentTypeName: string,
  gatewaySchema: GraphQLSchema,
): GraphQLObjectType[] {
  const subType =
    subschema.transformedSchema.getType(parentTypeName) ?? subschema.schema.getType(parentTypeName);
  if (isUnionType(subType)) {
    return subType.getTypes().filter(isObjectType);
  }
  if (isInterfaceType(subType)) {
    return subschema.transformedSchema.getPossibleTypes(subType).filter(isObjectType);
  }
  // Parent absent here (e.g. interface-object): fall back to gateway possibles
  // that physically exist on the subgraph.
  const gw = gatewaySchema.getType(parentTypeName);
  if (isAbstractType(gw)) {
    return gatewaySchema
      .getPossibleTypes(gw)
      .filter(
        c =>
          isObjectType(c) &&
          (subschema.transformedSchema.getType(c.name) != null ||
            subschema.schema.getType(c.name) != null),
      );
  }
  return [];
}

/**
 * Can `... on typeCondition` be spread under `parentTypeName` on this subgraph?
 */
function canSpreadOnSubschema(
  subschema: Subschema,
  parentTypeName: string,
  typeCondition: string,
): boolean {
  if (typeCondition === parentTypeName) {
    return subschema.transformedSchema.getType(parentTypeName) != null;
  }
  const parent =
    subschema.transformedSchema.getType(parentTypeName) ?? subschema.schema.getType(parentTypeName);
  const cond =
    subschema.transformedSchema.getType(typeCondition) ?? subschema.schema.getType(typeCondition);
  if (!parent || !cond) {
    return false;
  }
  if (isObjectType(cond)) {
    if (isUnionType(parent)) {
      return parent.getTypes().some(t => t.name === typeCondition);
    }
    if (isInterfaceType(parent)) {
      return subschema.transformedSchema
        .getPossibleTypes(parent)
        .some(t => t.name === typeCondition);
    }
    return parentTypeName === typeCondition;
  }
  // Interface condition under union/interface: valid if the type exists; field
  // expansion rewrites to concretes.
  return isInterfaceType(cond) || isUnionType(cond);
}

/**
 * Hive-QP-style rewrite: expand interface/union fragments into concrete
 * `... on Type` selections that are valid on this subgraph. Impossible spreads
 * (e.g. `... on Oven` under Node on A) become unavailable for later hops.
 */
function expandAbstractSelectionsForSubschema(
  subschema: Subschema,
  parentTypeName: string,
  selectionSet: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>,
  stitchingInfo: StitchingInfo,
  gatewaySchema: GraphQLSchema,
  providedFieldNames?: ReadonlySet<string>,
  providesOrigin?: ProvidesOrigin,
): { available: SelectionNode[]; unavailable: SelectionNode[] } {
  const available: SelectionNode[] = [];
  const unavailable: SelectionNode[] = [];

  const pushConcreteFields = (concreteName: string, fieldSelections: readonly SelectionNode[]) => {
    const nested = partitionSelectionsForSubschema(
      subschema,
      concreteName,
      selectionSetOf(fieldSelections),
      fragments,
      providedFieldNames,
      stitchingInfo,
      gatewaySchema,
      providesOrigin,
    );
    if (nested.available.length) {
      available.push({
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: {
          kind: Kind.NAMED_TYPE,
          name: { kind: Kind.NAME, value: concreteName },
        },
        selectionSet: selectionSetOf(nested.available),
      });
    }
    if (nested.unavailable.length) {
      unavailable.push({
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: {
          kind: Kind.NAMED_TYPE,
          name: { kind: Kind.NAME, value: concreteName },
        },
        selectionSet: selectionSetOf(nested.unavailable),
      });
    }
  };

  /** Flatten nested interface fragments onto a concrete (Toaster ← WithWarranty). */
  const flattenOntoConcrete = (
    concreteName: string,
    selections: readonly SelectionNode[],
  ): SelectionNode[] => {
    const out: SelectionNode[] = [];
    for (const sel of selections) {
      if (sel.kind === Kind.FIELD) {
        out.push(sel);
      } else if (sel.kind === Kind.INLINE_FRAGMENT) {
        const cond = sel.typeCondition?.name.value;
        if (!cond || cond === concreteName) {
          out.push(...flattenOntoConcrete(concreteName, sel.selectionSet.selections));
          continue;
        }
        const gwCond = gatewaySchema.getType(cond);
        const concrete = gatewaySchema.getType(concreteName);
        if (
          isInterfaceType(gwCond) &&
          isObjectType(concrete) &&
          concrete.getInterfaces().some(i => i.name === cond)
        ) {
          // Only keep if this concrete implements cond on the subgraph OR the
          // selected fields exist on the concrete locally (union+sibling iface).
          const subConcrete = subschema.transformedSchema.getType(concreteName);
          if (
            isObjectType(subConcrete) &&
            (subschema.transformedSchema
              .getPossibleTypes?.(subschema.transformedSchema.getType(cond) as GraphQLInterfaceType)
              ?.some(t => t.name === concreteName) ||
              sel.selectionSet.selections.some(
                s =>
                  s.kind === Kind.FIELD &&
                  (s.name.value === '__typename' ||
                    fieldAvailableOnSubschema(subschema, concreteName, s.name.value)),
              ))
          ) {
            out.push(...flattenOntoConcrete(concreteName, sel.selectionSet.selections));
          }
        } else if (cond === parentTypeName) {
          out.push(...flattenOntoConcrete(concreteName, sel.selectionSet.selections));
        }
      } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
        const fragment = fragments[sel.name.value];
        if (!fragment) {
          continue;
        }
        out.push(...flattenOntoConcrete(concreteName, fragment.selectionSet.selections));
      }
    }
    return out;
  };

  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      if (sel.name.value === '__typename') {
        available.push(sel);
        continue;
      }
      // Hive QP: abstract fields are planned per concrete. A field on the
      // interface SDL may be @override'd away from a local concrete (Post.
      // createdAt on A vs ImagePost) - only emit where the concrete has it.
      const concretes = concretesOnSubschema(subschema, parentTypeName, gatewaySchema);
      if (concretes.length) {
        let anyLocal = false;
        for (const concrete of concretes) {
          if (
            fieldFetchableOnSubschema(
              stitchingInfo,
              subschema,
              concrete.name,
              sel.name.value,
              providedFieldNames,
            )
          ) {
            pushConcreteFields(concrete.name, [sel]);
            anyLocal = true;
          } else {
            unavailable.push({
              kind: Kind.INLINE_FRAGMENT,
              typeCondition: {
                kind: Kind.NAMED_TYPE,
                name: { kind: Kind.NAME, value: concrete.name },
              },
              selectionSet: selectionSetOf([sel]),
            });
          }
        }
        if (!anyLocal) {
          // No local concrete can satisfy it - keep a typeless marker so
          // follow-up planning still sees the client field.
          unavailable.push(sel);
        }
        continue;
      }
      // Interface-object (no local concretes): fetch on the interface itself.
      if (
        fieldFetchableOnSubschema(
          stitchingInfo,
          subschema,
          parentTypeName,
          sel.name.value,
          providedFieldNames,
        )
      ) {
        available.push(sel);
      } else {
        unavailable.push(sel);
      }
      continue;
    }

    if (sel.kind === Kind.INLINE_FRAGMENT) {
      const cond = sel.typeCondition?.name.value ?? parentTypeName;
      const gwCond = gatewaySchema.getType(cond);

      if (isObjectType(gwCond)) {
        if (canSpreadOnSubschema(subschema, parentTypeName, cond)) {
          pushConcreteFields(cond, sel.selectionSet.selections);
        } else if (
          // @interfaceObject: concrete absent / not spreadable, but the
          // interface parent is here - keep interface-owned fields on this hop.
          isInterfaceType(
            subschema.transformedSchema.getType(parentTypeName) ??
              subschema.schema.getType(parentTypeName),
          )
        ) {
          const nested = partitionSelectionsForSubschema(
            subschema,
            parentTypeName,
            sel.selectionSet,
            fragments,
            providedFieldNames,
            stitchingInfo,
            gatewaySchema,
            providesOrigin,
          );
          for (const a of nested.available) {
            available.push(a);
          }
          if (nested.unavailable.length) {
            unavailable.push({
              ...sel,
              selectionSet: selectionSetOf(nested.unavailable),
            });
          } else if (nested.available.length) {
            // Typename probe so later hops can discriminate Admin vs User.
            unavailable.push({
              ...sel,
              selectionSet: selectionSetOf([
                {
                  kind: Kind.FIELD,
                  name: { kind: Kind.NAME, value: '__typename' },
                },
              ]),
            });
          }
        } else {
          unavailable.push(sel);
        }
        continue;
      }

      if (isInterfaceType(gwCond) || isUnionType(gwCond) || cond === parentTypeName) {
        // Expand to subgraph concretes under the parent (Hive FetchGraph style).
        const concretes = concretesOnSubschema(subschema, parentTypeName, gatewaySchema);
        // For a narrower interface condition (WithWarranty under Node), intersect
        // with gateway implementers that also exist in the concrete list.
        let targets = concretes;
        if (isInterfaceType(gwCond) && cond !== parentTypeName) {
          const impl = new Set(gatewaySchema.getPossibleTypes(gwCond).map(t => t.name));
          const parentSub =
            subschema.transformedSchema.getType(parentTypeName) ??
            subschema.schema.getType(parentTypeName);
          if (isUnionType(parentSub)) {
            // Under a union, Hive expands sibling interfaces onto union members
            // that implement them in the supergraph (Oven gets Node.id on A even
            // though Oven does not implement Node locally).
            targets = concretes.filter(c => impl.has(c.name));
          } else {
            // Under an interface parent, only local implementers are spreadable.
            const subCond = subschema.transformedSchema.getType(cond);
            if (isInterfaceType(subCond)) {
              const local = new Set(
                subschema.transformedSchema.getPossibleTypes(subCond).map(t => t.name),
              );
              targets = concretes.filter(c => local.has(c.name));
            } else {
              targets = concretes.filter(c => impl.has(c.name));
            }
          }
        }
        if (!targets.length) {
          unavailable.push(sel);
          continue;
        }
        for (const concrete of targets) {
          const flattened = flattenOntoConcrete(concrete.name, sel.selectionSet.selections);
          if (flattened.length) {
            pushConcreteFields(concrete.name, flattened);
          }
        }
        continue;
      }

      unavailable.push(sel);
      continue;
    }

    if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const fragment = fragments[sel.name.value];
      if (!fragment) {
        unavailable.push(sel);
        continue;
      }
      const expanded = expandAbstractSelectionsForSubschema(
        subschema,
        fragment.typeCondition.name.value,
        fragment.selectionSet,
        fragments,
        stitchingInfo,
        gatewaySchema,
        providedFieldNames,
        providesOrigin,
      );
      // Re-home under parent: concrete fragments stay; fields wrap in condition.
      for (const a of expanded.available) {
        available.push(a);
      }
      for (const u of expanded.unavailable) {
        unavailable.push(u);
      }
    }
  }

  return { available, unavailable };
}

/**
 * True when the field exists on the subschema AND any @requires deps are either
 * already provided or also available on the same hop. Fields like
 * `username @requires(fields: "name")` stay out of the root Fetch when `name`
 * is external - they become a later entity stage after the dep is fetched.
 */
function fieldFetchableOnSubschema(
  stitchingInfo: StitchingInfo,
  subschema: Subschema,
  typeName: string,
  fieldName: string,
  providedFieldNames?: ReadonlySet<string>,
): boolean {
  if (!fieldAvailableOnSubschema(subschema, typeName, fieldName, providedFieldNames)) {
    return false;
  }
  if (fieldName === '__typename') {
    return true;
  }
  // Only enforce @requires bridges (merge.fields / computed). fieldNodesByField
  // also carries cross-key links (Book.upc -> id, Product.id -> upc) that must
  // NOT block reading a locally-owned key - Hive QP still fetches Book.upc
  // from A without id.
  const mergeField = subschema.merge?.[typeName]?.fields?.[fieldName];
  if (!mergeField?.selectionSet && !mergeField?.computed) {
    return true;
  }
  const deps = stitchingInfo.fieldNodesByField?.[typeName]?.[fieldName];
  if (!deps?.length) {
    return true;
  }
  for (const dep of deps) {
    if (dep.name.value === fieldName) {
      continue;
    }
    if (providedFieldNames?.has(dep.name.value)) {
      continue;
    }
    if (!fieldAvailableOnSubschema(subschema, typeName, dep.name.value, providedFieldNames)) {
      return false;
    }
  }
  return true;
}

/**
 * Field names covered by `@provides` on a parent field for a given subschema.
 *
 * - `forTypeName` omitted: only unconditional fields (e.g. `categories { id }`).
 * - `forTypeName` set: also fields under `... on forTypeName` (e.g. media
 *   provides `... on Book { title }` -> title when partitioning Book).
 */
function getProvidedFieldNames(
  stitchingInfo: StitchingInfo,
  parentTypeName: string,
  parentFieldName: string,
  subschema: Subschema,
  forTypeName?: string,
): Set<string> {
  const provided =
    stitchingInfo.mergedTypes[parentTypeName]?.providedSelectionsByField?.get(subschema)?.[
      parentFieldName
    ];
  if (!provided) {
    return new Set();
  }
  const names = new Set<string>();
  const visit = (selections: readonly SelectionNode[], activeType: string | null) => {
    for (const sel of selections) {
      if (sel.kind === Kind.FIELD) {
        if (
          forTypeName == null
            ? activeType == null
            : activeType == null || activeType === forTypeName
        ) {
          names.add(sel.name.value);
        }
      } else if (sel.kind === Kind.INLINE_FRAGMENT) {
        visit(sel.selectionSet.selections, sel.typeCondition?.name.value ?? activeType);
      }
    }
  };
  visit(provided.selections, null);
  return names;
}

/**
 * Split a selection set into fields available on `subschema` vs the rest.
 * Used when building a root/entity Fetch for one subgraph.
 */
/** Origin of @provides on a parent field - used to expand type-conditioned provides. */
type ProvidesOrigin = {
  parentTypeName: string;
  parentFieldName: string;
};

function partitionSelectionsForSubschema(
  subschema: Subschema,
  typeName: string,
  selectionSet: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>,
  providedFieldNames?: ReadonlySet<string>,
  stitchingInfo?: StitchingInfo,
  /** Gateway schema - needed to resolve nested return types for @provides fields absent from the subgraph SDL. */
  gatewaySchema?: GraphQLSchema,
  providesOrigin?: ProvidesOrigin,
): { available: SelectionNode[]; unavailable: SelectionNode[] } {
  const available: SelectionNode[] = [];
  const unavailable: SelectionNode[] = [];
  // Merge type-conditioned provides (e.g. `... on Book { title }`) for this typeName.
  let effectiveProvided = providedFieldNames;
  if (stitchingInfo && providesOrigin) {
    const typed = getProvidedFieldNames(
      stitchingInfo,
      providesOrigin.parentTypeName,
      providesOrigin.parentFieldName,
      subschema,
      typeName,
    );
    if (typed.size) {
      effectiveProvided = new Set([...(providedFieldNames ?? []), ...typed]);
    }
  }
  const fetchable = (fieldName: string) => {
    const ok = stitchingInfo
      ? fieldFetchableOnSubschema(stitchingInfo, subschema, typeName, fieldName, effectiveProvided)
      : fieldAvailableOnSubschema(subschema, typeName, fieldName, effectiveProvided);
    if (!ok) {
      return false;
    }
    // Progressive override: when this subschema's override handler says the
    // field is not active, treat it as unavailable (entity hop / other owner).
    if (planningContext != null && fieldName !== '__typename') {
      const overrideHandler = subschema.merge?.[typeName]?.fields?.[fieldName]?.override;
      if (overrideHandler != null) {
        const info = {
          schema: gatewaySchema,
          parentType: gatewaySchema?.getType(typeName),
          fieldName,
          fieldNodes: [],
          fragments: {},
          variableValues: {},
          path: { key: fieldName, typename: typeName, prev: undefined },
        } as any;
        if (!handleOverrideByDelegation(info, planningContext, overrideHandler)) {
          return false;
        }
      }
    }
    return true;
  };

  const availableNames = new Map<string, number>();
  const pushAvailable = (sel: SelectionNode) => {
    if (sel.kind === Kind.FIELD) {
      const key = sel.alias?.value ?? sel.name.value;
      const idx = availableNames.get(key);
      if (idx != null) {
        const prev = available[idx];
        if (prev?.kind === Kind.FIELD) {
          available[idx] = mergeFieldNodes(prev, sel);
        }
        return;
      }
      availableNames.set(key, available.length);
    }
    available.push(sel);
  };

  const visit = (selections: readonly SelectionNode[]) => {
    for (const selection of selections) {
      if (selection.kind === Kind.FIELD) {
        if (!fetchable(selection.name.value)) {
          unavailable.push(selection);
          // Gateway-local / foreign field: still pull key deps that *are*
          // fetchable here (Book.author -> authorId) so nested Islands can run.
          // Require the dep on the *raw* subgraph schema so cross-key links
          // that only exist on the gateway view (Product.pid on PRODUCTS)
          // are not injected into outbound queries.
          const deps = stitchingInfo?.fieldNodesByField?.[typeName]?.[selection.name.value];
          if (deps?.length) {
            const rawParent = subschema.schema.getType(typeName);
            const rawFields =
              rawParent && 'getFields' in rawParent
                ? (rawParent as GraphQLObjectType).getFields()
                : undefined;
            for (const dep of deps) {
              if (
                dep.name.value === '__typename' ||
                !fetchable(dep.name.value) ||
                rawFields?.[dep.name.value] == null
              ) {
                continue;
              }
              // Dep FieldNodes can carry nested selections from other
              // subgraphs (ProductList.first -> products{id,pid}). Only keep
              // nested fields this subschema can actually query.
              if (!dep.selectionSet) {
                pushAvailable(dep);
                continue;
              }
              const depField = rawFields[dep.name.value];
              if (!depField) {
                continue;
              }
              const depReturn = getNamedType(depField.type);
              if (!depReturn || (!isObjectType(depReturn) && !isAbstractType(depReturn))) {
                pushAvailable({ ...dep, selectionSet: undefined });
                continue;
              }
              const nestedDep = partitionSelectionsForSubschema(
                subschema,
                depReturn.name,
                dep.selectionSet,
                fragments,
                providedFieldNames,
                stitchingInfo,
                gatewaySchema,
                {
                  parentTypeName: typeName,
                  parentFieldName: dep.name.value,
                },
              );
              if (nestedDep.available.length) {
                pushAvailable({
                  ...dep,
                  selectionSet: ensureTypename(selectionSetOf(nestedDep.available)),
                });
              }
            }
          }
          continue;
        }
        if (!selection.selectionSet) {
          pushAvailable(selection);
          continue;
        }
        // Recurse into nested selections so union/interface fragments for
        // types absent from this subgraph are stripped (Movie on graph A).
        // Prefer the subgraph field type when present (Viewer.book -> Book on A
        // so `... on Song` is rejected); fall back to the gateway schema for
        // @provides fields absent from the subgraph SDL (Product.categories).
        const subParent =
          subschema.transformedSchema.getType(typeName) ?? subschema.schema.getType(typeName);
        const gatewayParent = gatewaySchema?.getType(typeName);
        const subField =
          subParent && 'getFields' in subParent
            ? (subParent as GraphQLObjectType).getFields()[selection.name.value]
            : undefined;
        const gatewayField =
          gatewayParent && 'getFields' in gatewayParent
            ? (gatewayParent as GraphQLObjectType).getFields()[selection.name.value]
            : undefined;
        const nestedReturn = subField
          ? getNamedType(subField.type)
          : gatewayField
            ? getNamedType(gatewayField.type)
            : undefined;
        const nestedTypeName = nestedReturn?.name ?? typeName;
        // @provides on this field (e.g. products.categories -> name) apply to
        // the nested type's partition, not the parent type's.
        const nestedOrigin: ProvidesOrigin | undefined = stitchingInfo
          ? {
              parentTypeName: typeName,
              parentFieldName: selection.name.value,
            }
          : undefined;
        const nestedProvided =
          stitchingInfo != null
            ? getProvidedFieldNames(stitchingInfo, typeName, selection.name.value, subschema)
            : undefined;
        const nested = partitionSelectionsForSubschema(
          subschema,
          nestedTypeName,
          selection.selectionSet,
          fragments,
          nestedProvided?.size ? nestedProvided : undefined,
          stitchingInfo,
          gatewaySchema,
          nestedOrigin,
        );
        if (nested.available.length) {
          // Nested entities need __typename so later Flatten/entity Fetches
          // can match parents (Hive: book{__typename upc}).
          const nestedSs =
            nestedReturn && (isObjectType(nestedReturn) || isAbstractType(nestedReturn))
              ? ensureTypename(selectionSetOf(nested.available))
              : selectionSetOf(nested.available);
          pushAvailable({
            ...selection,
            selectionSet: nestedSs,
          });
        } else if (nested.unavailable.length) {
          // Field exists here but no nested selection applies (e.g. aMedia
          // with only `... on Movie` on graph A) - keep a stub so the key
          // still appears as {} in the response.
          pushAvailable({
            ...selection,
            selectionSet: selectionSetOf([
              {
                kind: Kind.FIELD,
                name: { kind: Kind.NAME, value: '__typename' },
              },
            ]),
          });
        }
        if (nested.unavailable.length && nested.available.length) {
          unavailable.push({
            ...selection,
            selectionSet: selectionSetOf(nested.unavailable),
          });
        }
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        const typeCondition = selection.typeCondition?.name.value ?? typeName;
        // Must check the type exists on this subgraph - __typename is always
        // "available" and must not be used as a proxy for type presence.
        const condType =
          subschema.transformedSchema.getType(typeCondition) ??
          subschema.schema.getType(typeCondition);
        const parentType =
          subschema.transformedSchema.getType(typeName) ?? subschema.schema.getType(typeName);
        let typeOnSubschema = typeCondition === typeName || condType != null;
        // Object parents cannot host fragments on a different object type
        // (book: Book cannot take `... on Song`).
        if (typeOnSubschema && isObjectType(parentType) && typeCondition !== typeName) {
          if (isObjectType(condType) && condType.name !== parentType.name) {
            typeOnSubschema = false;
          } else if (
            isInterfaceType(condType) &&
            !parentType.getInterfaces().some(i => i.name === condType.name)
          ) {
            typeOnSubschema = false;
          } else if (
            isUnionType(condType) &&
            !condType.getTypes().some(t => t.name === parentType.name)
          ) {
            typeOnSubschema = false;
          }
        }
        if (typeOnSubschema) {
          const nested = partitionSelectionsForSubschema(
            subschema,
            typeCondition,
            selection.selectionSet,
            fragments,
            // Keep parent provides origin so `... on Book { title }` applies.
            providedFieldNames,
            stitchingInfo,
            gatewaySchema,
            providesOrigin,
          );
          if (nested.available.length) {
            available.push({
              ...selection,
              selectionSet: selectionSetOf(nested.available),
            });
          }
          if (nested.unavailable.length) {
            unavailable.push({
              ...selection,
              selectionSet: selectionSetOf(nested.unavailable),
            });
          }
        } else {
          unavailable.push(selection);
        }
      } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
        const fragment = fragments[selection.name.value];
        if (!fragment) {
          unavailable.push(selection);
          continue;
        }
        const typeCondition = fragment.typeCondition.name.value;
        const nested = partitionSelectionsForSubschema(
          subschema,
          typeCondition,
          fragment.selectionSet,
          fragments,
          providedFieldNames,
          stitchingInfo,
          gatewaySchema,
          providesOrigin,
        );
        if (nested.available.length) {
          available.push({
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: fragment.typeCondition,
            directives: [...(fragment.directives ?? []), ...(selection.directives ?? [])],
            selectionSet: selectionSetOf(nested.available),
          });
        }
        if (nested.unavailable.length) {
          unavailable.push({
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: fragment.typeCondition,
            directives: [...(fragment.directives ?? []), ...(selection.directives ?? [])],
            selectionSet: selectionSetOf(nested.unavailable),
          });
        }
      }
    }
  };

  visit(selectionSet.selections);
  return { available, unavailable };
}

function flattenToFieldNodes(
  selections: readonly SelectionNode[],
  fragments: Record<string, FragmentDefinitionNode>,
): FieldNode[] {
  const fieldNodes: FieldNode[] = [];
  for (const selection of selections) {
    if (selection.kind === Kind.FIELD) {
      fieldNodes.push(selection);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      fieldNodes.push(...flattenToFieldNodes(selection.selectionSet.selections, fragments));
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const fragment = fragments[selection.name.value];
      if (fragment) {
        fieldNodes.push(...flattenToFieldNodes(fragment.selectionSet.selections, fragments));
      }
    }
  }
  return fieldNodes;
}

/**
 * Expand merge-key / @requires bridge fields the same way
 * `prepareGatewayDocument` does via `fieldNodesByField` - e.g. requesting
 * `nickname` also pulls `email` so the next entity hop has its key.
 */
/** Stable identity for a field node including alias + arguments (requires keys). */
function fieldNodeKey(field: FieldNode): string {
  const alias = field.alias?.value;
  const name = field.name.value;
  const args = field.arguments?.length
    ? JSON.stringify(field.arguments.map(a => [a.name.value, a.value]))
    : '';
  return `${alias ?? ''}:${name}:${args}`;
}

function expandFieldDependencies(
  stitchingInfo: StitchingInfo,
  typeName: string,
  fieldNodes: FieldNode[],
): FieldNode[] {
  const fieldNodesByField = stitchingInfo.fieldNodesByField?.[typeName];
  if (!fieldNodesByField) {
    return fieldNodes;
  }

  const result: FieldNode[] = [...fieldNodes];
  const seen = new Set(fieldNodes.map(fieldNodeKey));
  const queue = [...fieldNodes];

  while (queue.length) {
    const field = queue.shift()!;
    const deps = fieldNodesByField[field.name.value];
    if (!deps?.length) {
      continue;
    }
    for (const dep of deps) {
      const key = fieldNodeKey(dep);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(dep);
      queue.push(dep);
    }
  }

  return result;
}

function selectionSetFromFieldNodes(fieldNodes: readonly FieldNode[]): SelectionSetNode {
  return selectionSetOf(fieldNodes);
}

/**
 * Merge-key selections (usually `{ id }`) required on the parent before an
 * entity Fetch can build representations.
 */
function mergeKeySelectionsForType(
  mergedTypeInfo: NonNullable<StitchingInfo['mergedTypes'][string]>,
  owner: Subschema,
  typeName: string,
  alreadyCovered: ReadonlySet<string>,
): SelectionNode[] {
  const keys: SelectionNode[] = [];
  const seen = new Set<string>();
  const addFrom = (selectionSet: SelectionSetNode | undefined) => {
    if (!selectionSet) {
      return;
    }
    for (const sel of selectionSet.selections) {
      if (sel.kind !== Kind.FIELD) {
        continue;
      }
      const name = sel.name.value;
      if (
        name === '__typename' ||
        alreadyCovered.has(name) ||
        seen.has(name) ||
        !fieldAvailableOnSubschema(owner, typeName, name)
      ) {
        continue;
      }
      seen.add(name);
      keys.push(sel);
    }
  };
  for (const selectionSet of mergedTypeInfo.selectionSets.values()) {
    addFrom(selectionSet);
  }
  if (mergedTypeInfo.entryPointSelectionSets) {
    for (const sels of mergedTypeInfo.entryPointSelectionSets.values()) {
      for (const selectionSet of sels) {
        addFrom(selectionSet);
      }
    }
  }
  // Federation entities always key on `id` when present on the interface object.
  if (
    !alreadyCovered.has('id') &&
    !seen.has('id') &&
    fieldAvailableOnSubschema(owner, typeName, 'id')
  ) {
    keys.push({
      kind: Kind.FIELD,
      name: { kind: Kind.NAME, value: 'id' },
    });
  }
  return keys;
}

/** True when every field in `selection` is present on `subschema` under type. */
function selectionFullyLocalOnSubschema(
  subschema: Subschema,
  typeName: string,
  selection: SelectionNode,
  fragments: Record<string, FragmentDefinitionNode>,
): boolean {
  if (selection.kind === Kind.FIELD) {
    if (selection.name.value === '__typename') {
      return true;
    }
    if (!fieldAvailableOnSubschema(subschema, typeName, selection.name.value)) {
      return false;
    }
    if (!selection.selectionSet) {
      return true;
    }
    const type =
      subschema.transformedSchema.getType(typeName) ?? subschema.schema.getType(typeName);
    if (!type || !('getFields' in type)) {
      return false;
    }
    const field = (type as GraphQLObjectType).getFields()[selection.name.value];
    if (!field) {
      return false;
    }
    const nestedTypeName = getNamedType(field.type).name;
    return selection.selectionSet.selections.every(sel =>
      selectionFullyLocalOnSubschema(subschema, nestedTypeName, sel, fragments),
    );
  }
  if (selection.kind === Kind.INLINE_FRAGMENT) {
    const cond = selection.typeCondition?.name.value ?? typeName;
    if (
      subschema.transformedSchema.getType(cond) == null &&
      subschema.schema.getType(cond) == null
    ) {
      return false;
    }
    return selection.selectionSet.selections.every(sel =>
      selectionFullyLocalOnSubschema(subschema, cond, sel, fragments),
    );
  }
  if (selection.kind === Kind.FRAGMENT_SPREAD) {
    const fragment = fragments[selection.name.value];
    if (!fragment) {
      return false;
    }
    return selectionFullyLocalOnSubschema(
      subschema,
      fragment.typeCondition.name.value,
      {
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: fragment.typeCondition,
        selectionSet: fragment.selectionSet,
      },
      fragments,
    );
  }
  return false;
}

/**
 * When a nested field is only reachable by re-fetching the parent entity on
 * another subgraph (parent-entity-call), emit that entity Fetch directly.
 */
function planParentEntityNestedHop(
  _schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  entityTypeName: string,
  sourceSubschema: Subschema,
  fieldNode: FieldNode,
  flattenPath: Array<string | number>,
  fragments: Record<string, FragmentDefinitionNode>,
): StitchPlanNode | null {
  if (!stitchingInfo.mergedTypes[entityTypeName]) {
    return null;
  }
  for (const target of stitchingInfo.subschemaMap.values()) {
    if (target === sourceSubschema) {
      continue;
    }
    if (
      target.transformedSchema.getType(entityTypeName) == null &&
      target.schema.getType(entityTypeName) == null
    ) {
      continue;
    }
    // Require the full nested path (category.details.products) to be local -
    // typename stubs from partition must not count as a match (B vs C).
    if (!selectionFullyLocalOnSubschema(target, entityTypeName, fieldNode, fragments)) {
      continue;
    }
    return {
      kind: 'Fetch',
      subschema: target,
      entityTypeName,
      selectionSet: ensureTypename(selectionSetOf([fieldNode])),
      flattenPaths: [flattenPath],
    };
  }
  return null;
}

/**
 * Keep only selections fetchable on `subschema`, recursively stripping nested
 * fields the subgraph does not own (e.g. ProductList key `products { id pid }`
 * on PRODUCTS -> `products { id }` - pid lives on LINK).
 */
function filterSelectionTreeForSubschema(
  subschema: Subschema,
  typeName: string,
  selection: SelectionNode,
  stitchingInfo: StitchingInfo,
  gatewaySchema: GraphQLSchema,
  providedFieldNames?: ReadonlySet<string>,
): SelectionNode | null {
  if (selection.kind === Kind.FIELD) {
    if (selection.name.value === '__typename') {
      return selection;
    }
    if (
      !fieldFetchableOnSubschema(
        stitchingInfo,
        subschema,
        typeName,
        selection.name.value,
        providedFieldNames,
      )
    ) {
      return null;
    }
    if (!selection.selectionSet) {
      return selection;
    }
    const parent =
      subschema.transformedSchema.getType(typeName) ??
      subschema.schema.getType(typeName) ??
      gatewaySchema.getType(typeName);
    const field =
      parent && 'getFields' in parent
        ? (parent as GraphQLObjectType).getFields()[selection.name.value]
        : undefined;
    if (!field) {
      return null;
    }
    const nestedTypeName = getNamedType(field.type).name;
    const nested: SelectionNode[] = [];
    for (const sel of selection.selectionSet.selections) {
      const kept = filterSelectionTreeForSubschema(
        subschema,
        nestedTypeName,
        sel,
        stitchingInfo,
        gatewaySchema,
        undefined,
      );
      if (kept) {
        nested.push(kept);
      }
    }
    if (!nested.length) {
      return null;
    }
    return {
      ...selection,
      selectionSet: selectionSetOf(nested),
    };
  }
  if (selection.kind === Kind.INLINE_FRAGMENT) {
    const cond = selection.typeCondition?.name.value ?? typeName;
    if (
      subschema.transformedSchema.getType(cond) == null &&
      subschema.schema.getType(cond) == null
    ) {
      return null;
    }
    const nested: SelectionNode[] = [];
    for (const sel of selection.selectionSet.selections) {
      const kept = filterSelectionTreeForSubschema(
        subschema,
        cond,
        sel,
        stitchingInfo,
        gatewaySchema,
        providedFieldNames,
      );
      if (kept) {
        nested.push(kept);
      }
    }
    if (!nested.length) {
      return null;
    }
    return {
      ...selection,
      selectionSet: selectionSetOf(nested),
    };
  }
  return null;
}

/** Strip bridge selections to fields the Fetch's subschema can actually query. */
function filterBridgesForRootFetch(
  node: StitchPlanNode,
  bridges: readonly SelectionNode[],
  stitchingInfo: StitchingInfo,
  gatewaySchema: GraphQLSchema,
  parentTypeName: string,
): SelectionNode[] {
  if (node.kind !== 'Fetch' || !node.rootField) {
    return [];
  }
  const kept: SelectionNode[] = [];
  for (const bridge of bridges) {
    const filtered = filterSelectionTreeForSubschema(
      node.subschema,
      parentTypeName,
      bridge,
      stitchingInfo,
      gatewaySchema,
    );
    if (filtered) {
      kept.push(filtered);
    }
  }
  return kept;
}

/** Add selections (e.g. requires bridges) into every root Fetch of a plan node. */
function injectSelectionsIntoRootFetches(
  node: StitchPlanNode,
  extra: readonly SelectionNode[],
  /**
   * When set, each Fetch only receives the subset of `extra` valid on its
   * subschema (nested key fields like Product.pid on PRODUCTS are dropped).
   */
  filterCtx?: {
    stitchingInfo: StitchingInfo;
    gatewaySchema: GraphQLSchema;
    parentTypeName: string;
  },
): StitchPlanNode {
  if (node.kind === 'Fetch' && node.rootField) {
    const toInject = filterCtx
      ? filterBridgesForRootFetch(
          node,
          extra,
          filterCtx.stitchingInfo,
          filterCtx.gatewaySchema,
          filterCtx.parentTypeName,
        )
      : extra;
    if (!toInject.length) {
      return node;
    }
    const existing = [...(node.rootField.selectionSet?.selections ?? [])];
    const indexByKey = new Map<string, number>();
    for (let i = 0; i < existing.length; i++) {
      const s = existing[i]!;
      if (s.kind === Kind.FIELD) {
        indexByKey.set(s.alias?.value ?? s.name.value, i);
      }
    }
    let changed = false;
    for (const extraSel of toInject) {
      if (extraSel.kind !== Kind.FIELD) {
        existing.push(extraSel);
        changed = true;
        continue;
      }
      const key = extraSel.alias?.value ?? extraSel.name.value;
      const idx = indexByKey.get(key);
      if (idx != null) {
        const prev = existing[idx] as FieldNode;
        const merged = mergeFieldNodes(prev, extraSel);
        if (merged !== prev) {
          existing[idx] = merged;
          changed = true;
        }
      } else {
        indexByKey.set(key, existing.length);
        existing.push(extraSel);
        changed = true;
      }
    }
    if (!changed) {
      return node;
    }
    const selectionSet = selectionSetOf(existing);
    return {
      ...node,
      selectionSet,
      rootField: { ...node.rootField, selectionSet },
    };
  }
  if (node.kind === 'Parallel' || node.kind === 'Sequence') {
    return {
      ...node,
      nodes: node.nodes.map(n => injectSelectionsIntoRootFetches(n, extra, filterCtx)),
    };
  }
  return node;
}

/**
 * Collect client field nodes that apply to a concrete implementer of an
 * interface/union: shared fields on the abstract type + fields from matching
 * inline fragments / spreads.
 */
function collectFieldsForConcreteType(
  abstractType: GraphQLInterfaceType | GraphQLUnionType,
  concrete: GraphQLObjectType,
  selectionSet: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>,
  schema: GraphQLSchema,
): FieldNode[] {
  const fields: FieldNode[] = [];
  const concreteFields = concrete.getFields();

  const visit = (selections: readonly SelectionNode[], underConcreteFragment: boolean) => {
    for (const sel of selections) {
      if (sel.kind === Kind.FIELD) {
        if (sel.name.value === '__typename') {
          fields.push(sel);
          continue;
        }
        // Shared interface fields, or fields selected under a matching fragment
        if (
          underConcreteFragment ||
          (isInterfaceType(abstractType) && abstractType.getFields()[sel.name.value] != null)
        ) {
          if (concreteFields[sel.name.value] != null || sel.name.value === '__typename') {
            fields.push(sel);
          }
        }
      } else if (sel.kind === Kind.INLINE_FRAGMENT) {
        const cond = sel.typeCondition?.name.value;
        if (!cond || cond === concrete.name || cond === abstractType.name) {
          visit(sel.selectionSet.selections, cond === concrete.name || underConcreteFragment);
        } else {
          // Fragment on a sibling interface the concrete also implements
          const t = schema.getType(cond);
          if (isInterfaceType(t) && concrete.getInterfaces().some(i => i.name === cond)) {
            visit(sel.selectionSet.selections, true);
          }
        }
      } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
        const fragment = fragments[sel.name.value];
        if (!fragment) {
          continue;
        }
        const cond = fragment.typeCondition.name.value;
        if (cond === concrete.name || cond === abstractType.name) {
          visit(fragment.selectionSet.selections, cond === concrete.name || underConcreteFragment);
        }
      }
    }
  };

  visit(selectionSet.selections, false);
  return fields;
}

/**
 * Gateway-local field (additionalResolvers / @resolveTo) -> Island, with an
 * optional merge `continue` when the return type is federated, and nested
 * Islands for local fields on the return type (Foo.bar -> Bar.foo).
 */
function planLocalFieldIsland(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  parentTypeName: string,
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  flattenPath: PathSegment[],
  incompleteReasons: string[],
): StitchPlanNode {
  let continuePlan: StitchPlanNode | undefined;
  const parentType = schema.getType(parentTypeName);
  const field =
    parentType && (isObjectType(parentType) || isInterfaceType(parentType))
      ? parentType.getFields()[fieldNode.name.value]
      : undefined;
  if (field && fieldNode.selectionSet) {
    const returnType = getNamedType(field.type);
    const responseKey = fieldNode.alias?.value ?? fieldNode.name.value;
    const childPath = [...flattenPath, responseKey];
    const nestedFields = flattenToFieldNodes(fieldNode.selectionSet.selections, fragments);
    if (
      (isObjectType(returnType) || isAbstractType(returnType)) &&
      stitchingInfo.mergedTypes[returnType.name]
    ) {
      const merged = stitchingInfo.mergedTypes[returnType.name]!;
      const someSource = merged.targetSubschemas.keys().next().value as Subschema | undefined;
      if (someSource) {
        // appendNestedForFields inside also emits nested local-field Islands.
        continuePlan =
          planMergedTypeFollowUps(
            schema,
            stitchingInfo,
            returnType.name,
            someSource,
            nestedFields,
            fragments,
            variableValues,
            childPath,
            incompleteReasons,
          ) ?? undefined;
      }
    }

    // Non-merged return (Foo.bar -> Bar): still plan nested local Islands
    // (Bar.foo). Skip when merge continue already covered nested locals.
    if (!continuePlan && (isObjectType(returnType) || isInterfaceType(returnType))) {
      const nestedIslands = planLocalFieldIslands(
        schema,
        stitchingInfo,
        returnType.name,
        nestedFields,
        fragments,
        variableValues,
        childPath,
        incompleteReasons,
      );
      if (nestedIslands.length === 1) {
        continuePlan = nestedIslands[0];
      } else if (nestedIslands.length > 1) {
        continuePlan = { kind: 'Sequence', nodes: nestedIslands };
      }
    }
  }
  return {
    kind: 'Island',
    parentTypeName,
    fieldNode,
    flattenPaths: [flattenPath],
    continue: continuePlan,
  };
}

/**
 * Emit Islands for gateway-local fields among `fieldNodes` on `parentTypeName`.
 * Used for nested `@resolveTo` / additionalResolvers under a Fetch path.
 */
function planLocalFieldIslands(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  parentTypeName: string,
  fieldNodes: readonly FieldNode[],
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  flattenPath: PathSegment[],
  incompleteReasons: string[],
): StitchPlanNode[] {
  const islands: StitchPlanNode[] = [];
  const parentType = schema.getType(parentTypeName);
  for (const fieldNode of fieldNodes) {
    if (fieldNode.name.value === '__typename') {
      continue;
    }
    if (isLocalField(stitchingInfo.localFields, parentTypeName, fieldNode.name.value)) {
      islands.push(
        planLocalFieldIsland(
          schema,
          stitchingInfo,
          parentTypeName,
          fieldNode,
          fragments,
          variableValues,
          flattenPath,
          incompleteReasons,
        ),
      );
      continue;
    }
    // Non-local nested object/list (TargetQuery.targets -> TargetType): still
    // plan deeper gateway-local fields (TargetType.complexDataItem @resolveTo).
    // collectEntitiesAtPath expands list segments so flattenPaths stay index-free.
    if (!fieldNode.selectionSet) {
      continue;
    }
    if (!isObjectType(parentType) && !isInterfaceType(parentType)) {
      continue;
    }
    const field = parentType.getFields()[fieldNode.name.value];
    if (!field) {
      continue;
    }
    const namedReturn = getNamedType(field.type);
    if (!isObjectType(namedReturn) && !isInterfaceType(namedReturn)) {
      continue;
    }
    const responseKey = fieldNode.alias?.value ?? fieldNode.name.value;
    const childPath = [...flattenPath, responseKey];
    const nestedFieldNodes = flattenToFieldNodes(fieldNode.selectionSet.selections, fragments);
    // Merged return types: only emit Islands for gateway-local fields on that
    // type. Entity hops stay with planMergedTypeFollowUps / appendNestedForFields;
    // under encapsulate Island chains those paths never run, so locals like
    // TargetType.complexDataItem would otherwise be dropped.
    if (stitchingInfo.mergedTypes[namedReturn.name]) {
      for (const nested of nestedFieldNodes) {
        if (nested.name.value === '__typename') {
          continue;
        }
        if (isLocalField(stitchingInfo.localFields, namedReturn.name, nested.name.value)) {
          islands.push(
            planLocalFieldIsland(
              schema,
              stitchingInfo,
              namedReturn.name,
              nested,
              fragments,
              variableValues,
              childPath,
              incompleteReasons,
            ),
          );
        }
      }
      continue;
    }
    islands.push(
      ...planLocalFieldIslands(
        schema,
        stitchingInfo,
        namedReturn.name,
        nestedFieldNodes,
        fragments,
        variableValues,
        childPath,
        incompleteReasons,
      ),
    );
  }
  return islands;
}

function planMergedTypeFollowUps(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  typeName: string,
  sourceSubschema: Subschema,
  fieldNodes: FieldNode[],
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  flattenPath: Array<string | number>,
  incompleteReasons: string[],
  /** Extra selections (e.g. `... on User { age }` for @interfaceObject). */
  extraSelections: readonly SelectionNode[] = [],
): StitchPlanNode | null {
  const mergedTypeInfo = stitchingInfo.mergedTypes[typeName];
  if (!mergedTypeInfo?.delegationPlanBuilder) {
    return null;
  }

  // delegationPlanBuilder / getFieldsNotInSubschema use collectSubFields, which
  // reads nested selections off parent field nodes. Wrap the merged-type fields
  // the same way defaultMergedResolver does at resolve time.
  const planningParentField: FieldNode = {
    kind: Kind.FIELD,
    name: { kind: Kind.NAME, value: typeName },
    selectionSet: selectionSetOf([...fieldNodes, ...extraSelections]),
  };

  // Progressive override: fieldConfig.override handlers need context + info.
  const overrideInfo =
    planningContext != null
      ? ({
          schema,
          parentType: schema.getType(typeName),
          returnType: schema.getType(typeName),
          fieldName: typeName,
          fieldNodes: [planningParentField],
          fragments,
          variableValues,
          path: { key: typeName, typename: typeName, prev: undefined },
        } as any)
      : undefined;
  const delegationMaps = mergedTypeInfo.delegationPlanBuilder(
    schema,
    sourceSubschema,
    variableValues,
    fragments,
    [planningParentField],
    planningContext,
    overrideInfo,
  );

  const stages: StitchPlanNode[] = [];
  for (const delegationMap of delegationMaps) {
    const parallel: StitchPlanNode[] = [];
    for (const [targetSubschema, selectionSet] of delegationMap) {
      parallel.push({
        kind: 'Fetch',
        subschema: targetSubschema,
        entityTypeName: typeName,
        selectionSet: ensureTypename(selectionSet),
        flattenPaths: [flattenPath],
      });
    }
    if (parallel.length === 1) {
      stages.push(parallel[0]!);
    } else if (parallel.length > 1) {
      stages.push({ kind: 'Parallel', nodes: parallel });
    }
  }

  const nestedSourceCandidates: Subschema[] = [sourceSubschema];
  for (const delegationMap of delegationMaps) {
    for (const [target] of delegationMap) {
      if (!nestedSourceCandidates.includes(target)) {
        nestedSourceCandidates.push(target);
      }
    }
  }

  // Avoid planning the same nested entity path twice - once from a delegation
  // map selection (deep reviews tree) and again from the original fieldNodes.
  const plannedNestedKeys = new Set<string>();
  const nestedKey = (hopType: string, path: Array<string | number>): string =>
    `${hopType}::${path.join('\0')}`;

  const appendNestedForFields = (
    fields: readonly FieldNode[],
    /**
     * Subgraph that produced these field values (delegation map target). When
     * set, it is the first source for nested entity planning so fields like
     * Product.sku are not treated as already-local on PRODUCTS.
     */
    producedBy?: Subschema,
  ) => {
    const parentType = schema.getType(typeName);
    if (!isObjectType(parentType) && !isInterfaceType(parentType)) {
      return;
    }
    const uniqueOwner = mergedTypeInfo.uniqueFields;
    for (const fieldNode of fields) {
      if (fieldNode.name.value === '__typename') {
        continue;
      }
      // Gateway-local (@resolveTo / additionalResolvers) before entity hops.
      if (isLocalField(stitchingInfo.localFields, typeName, fieldNode.name.value)) {
        stages.push(
          planLocalFieldIsland(
            schema,
            stitchingInfo,
            typeName,
            fieldNode,
            fragments,
            variableValues,
            flattenPath,
            incompleteReasons,
          ),
        );
        continue;
      }
      if (!fieldNode.selectionSet) {
        continue;
      }
      const field = (parentType as GraphQLObjectType).getFields()[fieldNode.name.value];
      if (!field) {
        continue;
      }
      const namedReturn = getNamedType(field.type);
      if (!isObjectType(namedReturn) && !isAbstractType(namedReturn)) {
        continue;
      }
      const responseKey = fieldNode.alias?.value ?? fieldNode.name.value;
      const childPath = [...flattenPath, responseKey];
      const preferred = uniqueOwner[fieldNode.name.value];
      const sourcesToTry: Subschema[] = [];
      const pushUnique = (s: Subschema | undefined) => {
        if (s && !sourcesToTry.includes(s)) {
          sourcesToTry.push(s);
        }
      };
      // 1) Subgraph that actually returned this parent/field data
      pushUnique(producedBy);
      // 2) Field's unique owner (reviews -> REVIEWS)
      pushUnique(preferred);
      // 3) Other known sources from this merge plan
      for (const s of nestedSourceCandidates) {
        pushUnique(s);
      }

      // Nested abstract (Review.product -> Product): fan out Book/Magazine hops.
      if (isAbstractType(namedReturn) && fieldNode.selectionSet) {
        const nestedFollowUps: StitchPlanNode[] = [];
        for (const concrete of schema.getPossibleTypes(namedReturn)) {
          if (!stitchingInfo.mergedTypes[concrete.name]) {
            continue;
          }
          const key = nestedKey(concrete.name, childPath);
          if (plannedNestedKeys.has(key)) {
            continue;
          }
          const forConcrete = collectFieldsForConcreteType(
            namedReturn,
            concrete,
            fieldNode.selectionSet,
            fragments,
            schema,
          );
          if (!forConcrete.length) {
            continue;
          }
          let childPlan: StitchPlanNode | null = null;
          for (const candidate of sourcesToTry) {
            childPlan = planMergedTypeFollowUps(
              schema,
              stitchingInfo,
              concrete.name,
              candidate,
              forConcrete,
              fragments,
              variableValues,
              childPath,
              incompleteReasons,
            );
            if (childPlan) {
              break;
            }
          }
          if (childPlan) {
            plannedNestedKeys.add(key);
            nestedFollowUps.push(childPlan);
          }
        }
        if (nestedFollowUps.length === 1) {
          stages.push(nestedFollowUps[0]!);
        } else if (nestedFollowUps.length > 1) {
          stages.push({ kind: 'Parallel', nodes: nestedFollowUps });
        }
        continue;
      }

      const childTypeName = namedReturn.name;
      const nestedFieldNodes = flattenToFieldNodes(fieldNode.selectionSet.selections, fragments);
      // Non-merged nested type (Book under Author.books): still plan Islands
      // for gateway-local fields like Book.author @resolveTo.
      if (!stitchingInfo.mergedTypes[childTypeName]) {
        const localIslands = planLocalFieldIslands(
          schema,
          stitchingInfo,
          childTypeName,
          nestedFieldNodes,
          fragments,
          variableValues,
          childPath,
          incompleteReasons,
        );
        for (const island of localIslands) {
          stages.push(island);
        }
        continue;
      }
      const key = nestedKey(childTypeName, childPath);
      if (plannedNestedKeys.has(key)) {
        continue;
      }
      let childPlan: StitchPlanNode | null = null;
      for (const candidate of sourcesToTry) {
        childPlan = planMergedTypeFollowUps(
          schema,
          stitchingInfo,
          childTypeName,
          candidate,
          nestedFieldNodes,
          fragments,
          variableValues,
          childPath,
          incompleteReasons,
        );
        if (childPlan) {
          break;
        }
      }
      if (childPlan) {
        plannedNestedKeys.add(key);
        stages.push(childPlan);
      }
    }
  };

  // Nested merges for fields fetched in requires-dep stages (e.g. Comment.authorId
  // after Post fetches `_comments: comments { authorId }`) - must run before the
  // leftover client-field hop that depends on those keys.
  for (const delegationMap of delegationMaps) {
    for (const [target, selectionSet] of delegationMap) {
      appendNestedForFields(flattenToFieldNodes(selectionSet.selections, fragments), target);
    }
  }

  // @requires leftovers: after deps (+ nested key resolution), fetch the real
  // client fields from the requiring subschemas.
  const leftOver = leftOverByDelegationPlan.get(delegationMaps);
  if (leftOver?.unproxiableFieldNodes?.length && leftOver.nonProxiableSubschemas?.length) {
    if (leftOver.nonProxiableSubschemas) {
      for (const s of leftOver.nonProxiableSubschemas) {
        if (!nestedSourceCandidates.includes(s)) {
          nestedSourceCandidates.push(s);
        }
      }
    }
    // Gateway-local leftovers are not entity-fetchable. Skip them here -
    // appendNestedForFields(fieldNodes) emits each local Island once.
    const fetchableLeftovers: FieldNode[] = [];
    for (const fieldNode of leftOver.unproxiableFieldNodes) {
      if (isLocalField(stitchingInfo.localFields, typeName, fieldNode.name.value)) {
        continue;
      }
      fetchableLeftovers.push(fieldNode);
    }
    const leftoverByTarget = new Map<Subschema, FieldNode[]>();
    for (const fieldNode of fetchableLeftovers) {
      const fieldName = fieldNode.name.value;
      const unique = mergedTypeInfo.uniqueFields[fieldName];
      const targets = unique
        ? leftOver.nonProxiableSubschemas.filter(s => s === unique)
        : leftOver.nonProxiableSubschemas.filter(s => {
            const nonUnique = mergedTypeInfo.nonUniqueFields[fieldName];
            return nonUnique?.includes(s) || unique == null;
          });
      const chosen = (targets.length ? targets : leftOver.nonProxiableSubschemas)[0];
      if (!chosen) {
        continue;
      }
      let list = leftoverByTarget.get(chosen);
      if (!list) {
        list = [];
        leftoverByTarget.set(chosen, list);
      }
      list.push(fieldNode);
    }
    // Order leftovers by @requires edges among themselves (byNovice before
    // byExpert in requires-circular). Independent leftovers stay Parallel.
    const leftoverEntries = [...leftoverByTarget.entries()];
    const leftoverFieldNodes = leftoverEntries.flatMap(([, fields]) => fields);
    const leftoverNames = new Set(leftoverFieldNodes.map(f => f.name.value));
    const dependsOnLeftover = (fieldName: string): string[] => {
      const deps = stitchingInfo.fieldNodesByField?.[typeName]?.[fieldName];
      if (!deps?.length) {
        return [];
      }
      return deps.map(d => d.name.value).filter(n => n !== fieldName && leftoverNames.has(n));
    };
    const hasCrossDeps = leftoverFieldNodes.some(f => dependsOnLeftover(f.name.value).length > 0);
    if (!hasCrossDeps) {
      if (leftoverByTarget.size === 1) {
        const [target, fields] = leftoverEntries[0]!;
        stages.push({
          kind: 'Fetch',
          subschema: target,
          entityTypeName: typeName,
          selectionSet: ensureTypename(selectionSetOf(fields)),
          flattenPaths: [flattenPath],
        });
      } else if (leftoverByTarget.size > 1) {
        stages.push({
          kind: 'Parallel',
          nodes: leftoverEntries.map(([target, fields]) => ({
            kind: 'Fetch' as const,
            subschema: target,
            entityTypeName: typeName,
            selectionSet: ensureTypename(selectionSetOf(fields)),
            flattenPaths: [flattenPath],
          })),
        });
      }
    } else {
      // Topological batches: fields with no unmet leftover deps first.
      const remaining = new Map(leftoverFieldNodes.map(f => [f.name.value, f] as const));
      const ownerOf = new Map<string, Subschema>();
      for (const [target, fields] of leftoverEntries) {
        for (const f of fields) {
          ownerOf.set(f.name.value, target);
        }
      }
      const orderedBatches: FieldNode[][] = [];
      while (remaining.size) {
        const batch: FieldNode[] = [];
        for (const [name, field] of remaining) {
          const unmet = dependsOnLeftover(name).filter(d => remaining.has(d));
          if (!unmet.length) {
            batch.push(field);
          }
        }
        if (!batch.length) {
          // Cycle fallback - emit the rest in one parallel group.
          batch.push(...remaining.values());
          remaining.clear();
        } else {
          for (const f of batch) {
            remaining.delete(f.name.value);
          }
        }
        orderedBatches.push(batch);
      }
      const batchNodes: StitchPlanNode[] = orderedBatches.map(batch => {
        const byTarget = new Map<Subschema, FieldNode[]>();
        for (const f of batch) {
          const target = ownerOf.get(f.name.value)!;
          let list = byTarget.get(target);
          if (!list) {
            list = [];
            byTarget.set(target, list);
          }
          list.push(f);
        }
        if (byTarget.size === 1) {
          const [target, fields] = [...byTarget.entries()][0]!;
          return {
            kind: 'Fetch' as const,
            subschema: target,
            entityTypeName: typeName,
            selectionSet: ensureTypename(selectionSetOf(fields)),
            flattenPaths: [flattenPath],
          };
        }
        return {
          kind: 'Parallel' as const,
          nodes: [...byTarget.entries()].map(([target, fields]) => ({
            kind: 'Fetch' as const,
            subschema: target,
            entityTypeName: typeName,
            selectionSet: ensureTypename(selectionSetOf(fields)),
            flattenPaths: [flattenPath],
          })),
        };
      });
      if (batchNodes.length === 1) {
        stages.push(batchNodes[0]!);
      } else {
        stages.push({ kind: 'Sequence', nodes: batchNodes });
      }
    }
  }

  // Nested merges for the original client selection (Review.product.inStock, …).
  appendNestedForFields(fieldNodes);

  if (!stages.length) {
    return null;
  }
  if (stages.length === 1) {
    return stages[0]!;
  }
  return { kind: 'Sequence', nodes: stages };
}

function planRootField(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  operation: OperationDefinitionNode,
  fieldNode: FieldNode,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  incompleteReasons: string[],
): StitchPlanNode {
  const rootType = getDefinedRootType(schema, operation.operation);
  const fieldName = fieldNode.name.value;
  const responseKey = fieldNode.alias?.value ?? fieldName;

  // Meta-field: Island writes the root type name (pure `{ __typename }` included).
  if (fieldName === '__typename') {
    return {
      kind: 'Island',
      parentTypeName: rootType.name,
      fieldNode,
    };
  }

  if (isLocalField(stitchingInfo.localFields, rootType.name, fieldName)) {
    let continuePlan: StitchPlanNode | undefined;
    const field = rootType.getFields()[fieldName];
    if (field && fieldNode.selectionSet) {
      const returnType = getNamedType(field.type);
      const nestedFields = flattenToFieldNodes(fieldNode.selectionSet.selections, fragments);
      if (
        (isObjectType(returnType) || isAbstractType(returnType)) &&
        stitchingInfo.mergedTypes[returnType.name]
      ) {
        // After local resolve, hydrate missing federated fields from any
        // subschema that can merge this type - pick the first target.
        const merged = stitchingInfo.mergedTypes[returnType.name]!;
        const someSource = merged.targetSubschemas.keys().next().value as Subschema | undefined;
        if (someSource) {
          continuePlan =
            planMergedTypeFollowUps(
              schema,
              stitchingInfo,
              returnType.name,
              someSource,
              nestedFields,
              fragments,
              variableValues,
              [responseKey],
              incompleteReasons,
            ) ?? undefined;
        }
      }
      // Encapsulate `@resolveTo(__typename)` and other non-merged wrappers:
      // plan nested local Islands (SubgraphA.foo) the same way nested
      // planLocalFieldIsland does — otherwise the root Island leaves a string
      // typename and projectDataToOperation returns `"SubgraphA": "Query"`.
      if (!continuePlan && (isObjectType(returnType) || isInterfaceType(returnType))) {
        const nestedIslands = planLocalFieldIslands(
          schema,
          stitchingInfo,
          returnType.name,
          nestedFields,
          fragments,
          variableValues,
          [responseKey],
          incompleteReasons,
        );
        if (nestedIslands.length === 1) {
          continuePlan = nestedIslands[0];
        } else if (nestedIslands.length > 1) {
          continuePlan = { kind: 'Sequence', nodes: nestedIslands };
        }
      }
    }
    return {
      kind: 'Island',
      parentTypeName: rootType.name,
      fieldNode,
      continue: continuePlan,
    };
  }

  const allOwners = findOwningSubschemasForRootField(stitchingInfo, operation.operation, fieldName);
  // Progressive override on the root field (Query.feed @override(label:)):
  // drop owners whose override handler says the field is inactive.
  const owners =
    planningContext == null
      ? allOwners
      : allOwners.filter(owner => {
          const overrideHandler = owner.merge?.[rootType.name]?.fields?.[fieldName]?.override;
          if (overrideHandler == null) {
            return true;
          }
          const info = {
            schema,
            parentType: rootType,
            fieldName,
            fieldNodes: [fieldNode],
            fragments: {},
            variableValues,
            path: { key: fieldName, typename: rootType.name, prev: undefined },
          } as any;
          return handleOverrideByDelegation(info, planningContext, overrideHandler);
        });
  if (!owners.length) {
    incompleteReasons.push(`No subschema owns root field ${fieldName}`);
    return {
      kind: 'Island',
      parentTypeName: rootType.name,
      fieldNode,
    };
  }

  const field = rootType.getFields()[fieldName];
  const returnType = field ? getNamedType(field.type) : null;
  const returnTypeName = returnType?.name;

  const requested: FieldNode[] = fieldNode.selectionSet
    ? flattenToFieldNodes(fieldNode.selectionSet.selections, fragments)
    : [];

  const withDeps =
    returnTypeName && requested.length
      ? expandFieldDependencies(stitchingInfo, returnTypeName, requested)
      : requested;

  // Preserve inline-fragment @skip/@include wrappers for subgraph evaluation.
  // Flattening into field nodes would drop those directives (provides-scope).
  // Merge deps into same-name fields so shallow client selections (data {
  // __typename }) absorb deeper @requires bridges (data { foo ... on Bar }).
  const selectionSetForPartition: SelectionSetNode | undefined =
    fieldNode.selectionSet && returnTypeName
      ? (() => {
          const merged: SelectionNode[] = [...fieldNode.selectionSet.selections];
          const indexByKey = new Map<string, number>();
          for (let i = 0; i < merged.length; i++) {
            const s = merged[i]!;
            if (s.kind === Kind.FIELD) {
              indexByKey.set(s.alias?.value ?? s.name.value, i);
            }
          }
          for (const dep of withDeps) {
            const key = dep.alias?.value ?? dep.name.value;
            const idx = indexByKey.get(key);
            if (idx != null && merged[idx]?.kind === Kind.FIELD) {
              merged[idx] = mergeFieldNodes(merged[idx] as FieldNode, dep);
            } else if (idx == null) {
              indexByKey.set(key, merged.length);
              merged.push(dep);
            }
          }
          return selectionSetOf(merged);
        })()
      : undefined;

  // Per-owner partition: schema fields + @provides on this root field.
  type OwnerPartition = {
    owner: Subschema;
    available: SelectionNode[];
    unavailable: SelectionNode[];
    provided: Set<string>;
    /** Scalar/enum root field - Fetch the field node as-is (no selection set). */
    leafField?: boolean;
  };
  const partitions: OwnerPartition[] = owners.map(owner => {
    const provided = getProvidedFieldNames(stitchingInfo, rootType.name, fieldName, owner);
    // Scalars/enums (mutations like add -> Int): the root field is the unit.
    if (returnType != null && isLeafType(returnType)) {
      return {
        owner,
        available: [],
        unavailable: [],
        provided,
        leafField: true,
      };
    }
    if (!returnTypeName || !fieldNode.selectionSet) {
      return {
        owner,
        available: fieldNode.selectionSet?.selections ? [...fieldNode.selectionSet.selections] : [],
        unavailable: [],
        provided,
        leafField: !fieldNode.selectionSet,
      };
    }
    // Abstract return types: Hive-QP-style concrete expansion so subgraph
    // queries stay valid (`... on Oven` under Node on A is stripped; `... on
    // Node { id }` under Product expands to Oven+Toaster).
    if (returnType && isAbstractType(returnType) && fieldNode.selectionSet) {
      const mediaProvidesOrigin: ProvidesOrigin = {
        parentTypeName: rootType.name,
        parentFieldName: fieldName,
      };
      const expanded = expandAbstractSelectionsForSubschema(
        owner,
        returnTypeName!,
        fieldNode.selectionSet,
        fragments,
        stitchingInfo,
        schema,
        provided,
        mediaProvidesOrigin,
      );
      const available: SelectionNode[] = [...expanded.available];
      const unavailable: SelectionNode[] = [...expanded.unavailable];
      // Retain nested object-field partitioning for rare abstract.field { … }
      // selections (not fragment-shaped) that expand left as FIELD nodes.
      for (const sel of [...available]) {
        if (sel.kind !== Kind.FIELD || !sel.selectionSet) {
          continue;
        }
        if (sel.name.value === '__typename') {
          continue;
        }
        const nestedProvided = getProvidedFieldNames(
          stitchingInfo,
          returnTypeName!,
          sel.name.value,
          owner,
        );
        const fieldDef = (schema.getType(returnTypeName!) ??
          owner.transformedSchema.getType(returnTypeName!) ??
          owner.schema.getType(returnTypeName!)) as GraphQLObjectType | undefined;
        const nestedReturn = fieldDef?.getFields()?.[sel.name.value]
          ? getNamedType(fieldDef.getFields()[sel.name.value]!.type)
          : undefined;
        if (!nestedReturn || (!isAbstractType(nestedReturn) && !isObjectType(nestedReturn))) {
          continue;
        }
        if (isAbstractType(nestedReturn)) {
          const nested = expandAbstractSelectionsForSubschema(
            owner,
            nestedReturn.name,
            sel.selectionSet,
            fragments,
            stitchingInfo,
            schema,
            nestedProvided.size ? nestedProvided : provided,
            {
              parentTypeName: returnTypeName!,
              parentFieldName: sel.name.value,
            },
          );
          const idx = available.indexOf(sel);
          if (nested.available.length) {
            available[idx] = {
              ...sel,
              selectionSet: ensureTypename(selectionSetOf(nested.available)),
            };
          } else {
            available.splice(idx, 1);
          }
          if (nested.unavailable.length) {
            unavailable.push({
              ...sel,
              selectionSet: selectionSetOf(nested.unavailable),
            });
          }
          continue;
        }
        const nested = partitionSelectionsForSubschema(
          owner,
          nestedReturn.name,
          sel.selectionSet,
          fragments,
          nestedProvided.size ? nestedProvided : provided,
          stitchingInfo,
          schema,
          {
            parentTypeName: returnTypeName!,
            parentFieldName: sel.name.value,
          },
        );
        const idx = available.indexOf(sel);
        if (nested.available.length) {
          available[idx] = {
            ...sel,
            selectionSet: ensureTypename(selectionSetOf(nested.available)),
          };
        } else if (nested.unavailable.length) {
          available[idx] = {
            ...sel,
            selectionSet: selectionSetOf([
              {
                kind: Kind.FIELD,
                name: { kind: Kind.NAME, value: '__typename' },
              },
            ]),
          };
        }
        if (nested.unavailable.length && nested.available.length) {
          unavailable.push({
            ...sel,
            selectionSet: selectionSetOf(nested.unavailable),
          });
        }
      }
      // Own the root even when only concrete fragments were requested: fetch
      // interface __typename + merge keys so entity hops can run.
      if (
        available.length === 0 &&
        unavailable.length > 0 &&
        owner.transformedSchema.getType(returnTypeName) != null
      ) {
        available.push({
          kind: Kind.FIELD,
          name: { kind: Kind.NAME, value: '__typename' },
        });
        if (fieldAvailableOnSubschema(owner, returnTypeName, 'id')) {
          available.push({
            kind: Kind.FIELD,
            name: { kind: Kind.NAME, value: 'id' },
          });
        }
      }
      return { owner, available, unavailable, provided };
    }
    const partitioned = partitionSelectionsForSubschema(
      owner,
      returnTypeName,
      selectionSetForPartition ?? selectionSetFromFieldNodes(withDeps),
      fragments,
      provided,
      stitchingInfo,
      schema,
      { parentTypeName: rootType.name, parentFieldName: fieldName },
    );
    return {
      owner,
      available: partitioned.available,
      unavailable: partitioned.unavailable,
      provided,
    };
  });

  // Shared-root: several subgraphs each contribute distinct selections for the
  // same root field -> Parallel root Fetches (results deep-merged at execute).
  const contributing = partitions.filter(p => p.leafField || p.available.length > 0);

  const meaningful = contributing.filter(
    p =>
      p.leafField ||
      p.available.some(sel => !(sel.kind === Kind.FIELD && sel.name.value === '__typename')),
  );
  let usedPartitions = meaningful.length ? meaningful : contributing;

  // Prefer owners that cover more of the client selection (override / provides).
  usedPartitions.sort((a, b) => b.available.length - a.available.length);

  // Mutations must not fan out to every declared owner (addCategory on A+B would
  // run twice). Keep the single best-covering subgraph.
  if (operation.operation === 'mutation' && usedPartitions.length > 1) {
    usedPartitions = [usedPartitions[0]!];
  }

  const rootFetches: StitchPlanNode[] = usedPartitions.map(p => {
    if (p.leafField) {
      return {
        kind: 'Fetch' as const,
        subschema: p.owner,
        rootField: { ...fieldNode, selectionSet: undefined },
        selectionSet: selectionSetOf([]),
      };
    }
    // Abstract roots need subgraph `__typename` for runtime typing. Concrete
    // roots stamp typename locally after fetch (classic stitch parity - avoid
    // injecting `__typename` into the outbound query when the client did not
    // ask for it). Nested entity parents still get ensureTypename via
    // partitionSelectionsForSubschema.
    const selectionSet =
      returnType && isAbstractType(returnType)
        ? ensureTypename(selectionSetOf(p.available))
        : selectionSetOf(p.available);
    return {
      kind: 'Fetch' as const,
      subschema: p.owner,
      rootField: {
        ...fieldNode,
        selectionSet,
      },
      selectionSet,
    };
  });

  if (!rootFetches.length) {
    incompleteReasons.push(`No subschema could satisfy root field ${fieldName}`);
    return {
      kind: 'Island',
      parentTypeName: rootType.name,
      fieldNode,
    };
  }

  // Hive QP: bare fields on an abstract root (node { id }) need a subgraph that
  // can resolve the field for every runtime type it may return. Complementary
  // Parallel fetches (`A: ... on Account { id }` + `B: ... on Chat { id }`) are
  // not a valid path - corrupted-supergraph-node-id expects plan failure.
  // Only when multiple root owners contribute: a single owner can finish via
  // entity hops (override-type-interface createdAt, @interfaceObject).
  if (
    returnType &&
    isAbstractType(returnType) &&
    fieldNode.selectionSet &&
    usedPartitions.length > 1
  ) {
    for (const sel of fieldNode.selectionSet.selections) {
      if (sel.kind !== Kind.FIELD || sel.name.value === '__typename') {
        continue;
      }
      const bareName = sel.name.value;
      const resolvableOnSomeOwner = usedPartitions.some(p => {
        // @interfaceObject: no local concretes - interface-level fields are OK.
        const localConcretes = concretesOnSubschema(p.owner, returnType.name, schema);
        if (!localConcretes.length) {
          return fieldFetchableOnSubschema(
            stitchingInfo,
            p.owner,
            returnType.name,
            bareName,
            p.provided,
          );
        }
        // Every concrete this subgraph may return must own the field locally.
        return localConcretes.every(c =>
          fieldFetchableOnSubschema(stitchingInfo, p.owner, c.name, bareName, p.provided),
        );
      });
      if (!resolvableOnSomeOwner) {
        incompleteReasons.push(
          `No paths found for selection item: ${fieldName} (unresolvable interface field ${bareName})`,
        );
        return {
          kind: 'Island',
          parentTypeName: rootType.name,
          fieldNode,
        };
      }
    }
  }

  const rootNode: StitchPlanNode =
    rootFetches.length === 1 ? rootFetches[0]! : { kind: 'Parallel', nodes: rootFetches };

  // Fields already fetched on any root contribution.
  // Unconditional fields (shared) vs type-conditioned (`... on Book { title }`)
  // stay separate - Book.title must not suppress Movie.title hops.
  const coveredNames = new Set<string>();
  const coveredByType = new Map<string, Set<string>>();
  const markCovered = (fieldName: string, typeCond?: string | null) => {
    if (typeCond) {
      let set = coveredByType.get(typeCond);
      if (!set) {
        set = new Set();
        coveredByType.set(typeCond, set);
      }
      set.add(fieldName);
    } else {
      coveredNames.add(fieldName);
    }
  };
  const isFieldCovered = (fieldName: string, typeName?: string) => {
    if (coveredNames.has(fieldName)) {
      return true;
    }
    if (typeName && coveredByType.get(typeName)?.has(fieldName)) {
      return true;
    }
    return false;
  };
  const collectCovered = (sels: readonly SelectionNode[], typeCond?: string | null) => {
    for (const sel of sels) {
      if (sel.kind === Kind.FIELD) {
        markCovered(sel.name.value, typeCond);
      } else if (sel.kind === Kind.INLINE_FRAGMENT) {
        collectCovered(sel.selectionSet.selections, sel.typeCondition?.name.value ?? typeCond);
      }
    }
  };
  for (const p of usedPartitions) {
    collectCovered(p.available);
  }

  const primary = usedPartitions[0]!.owner;

  // Partial root fields (animals { id name } fetched, but `... on Cat { age }`
  // still unavailable): plan nested entity hops for the unavailable remainder
  // without re-fetching the already-covered field.
  const partialUnavailableFollowUps: StitchPlanNode[] = [];
  if (returnType && fieldNode.selectionSet) {
    for (const p of usedPartitions) {
      const availNames = new Set(
        p.available.filter(s => s.kind === Kind.FIELD).map(s => (s as FieldNode).name.value),
      );
      // Also collect field names covered under concrete fragments
      // (`... on Book { animals }`) so partial hops still attach.
      for (const a of p.available) {
        if (a.kind === Kind.INLINE_FRAGMENT) {
          for (const nested of a.selectionSet.selections) {
            if (nested.kind === Kind.FIELD) {
              availNames.add(nested.name.value);
            }
          }
        }
      }
      for (const sel of p.unavailable ?? []) {
        // Concrete-expanded remainders: `... on Book { animals { ... on Cat { age } } }`
        // Skip fields another root partition already covered (B @provides title
        // must not spawn a punished C hop from A's unavailable Book.title).
        if (sel.kind === Kind.INLINE_FRAGMENT && sel.typeCondition) {
          const concreteName = sel.typeCondition.name.value;
          if (!stitchingInfo.mergedTypes[concreteName]) {
            continue;
          }
          const remnantFields: FieldNode[] = [];
          for (const fn of flattenToFieldNodes(sel.selectionSet.selections, fragments)) {
            if (fn.name.value === '__typename') {
              continue;
            }
            if (!isFieldCovered(fn.name.value, concreteName)) {
              remnantFields.push(fn);
              continue;
            }
            // Field already fetched (animals via @provides id/name) - only keep
            // nested type-conditioned remnants (`... on Cat { age }`).
            if (!fn.selectionSet) {
              continue;
            }
            const onlyFragments = fn.selectionSet.selections.filter(
              s => s.kind === Kind.INLINE_FRAGMENT || s.kind === Kind.FRAGMENT_SPREAD,
            );
            if (onlyFragments.length) {
              remnantFields.push({
                ...fn,
                selectionSet: selectionSetOf(onlyFragments),
              });
            }
          }
          if (!remnantFields.length) {
            continue;
          }
          // Prefer the partition that already fetched the parent field
          // (B @provides animals) as the entity source - hopping from A
          // overwrites animals with null under PUNISH_FOR_POOR_PLANS.
          let sourceOwner = p.owner;
          let bestScore = -1;
          for (const op of usedPartitions) {
            for (const a of op.available) {
              if (a.kind !== Kind.INLINE_FRAGMENT || a.typeCondition?.name.value !== concreteName) {
                continue;
              }
              const score = a.selectionSet.selections.length;
              if (score > bestScore) {
                bestScore = score;
                sourceOwner = op.owner;
              }
            }
          }
          // Deduplicate: only emit from the first unavailable we see once the
          // best source is known - skip if this partition isn't that source
          // and another partition already covers the concrete.
          if (bestScore >= 0 && sourceOwner !== p.owner) {
            continue;
          }
          const child = planMergedTypeFollowUps(
            schema,
            stitchingInfo,
            concreteName,
            sourceOwner,
            remnantFields,
            fragments,
            variableValues,
            [fieldNode.alias?.value ?? fieldNode.name.value],
            incompleteReasons,
          );
          if (child) {
            partialUnavailableFollowUps.push(child);
          }
          continue;
        }
        if (sel.kind !== Kind.FIELD) {
          continue;
        }
        const rootKey = fieldNode.alias?.value ?? fieldNode.name.value;
        // Completely unavailable gateway-local field (Book.author @resolveTo).
        // Merged return types: planMergedTypeFollowUps -> appendNestedForFields
        // owns these Islands. Emitting here too duplicates the Island (Task.user
        // dataloader: second batch sees undefined ids).
        if (
          returnTypeName &&
          !availNames.has(sel.name.value) &&
          isLocalField(stitchingInfo.localFields, returnTypeName, sel.name.value)
        ) {
          if (!stitchingInfo.mergedTypes[returnTypeName]) {
            partialUnavailableFollowUps.push(
              planLocalFieldIsland(
                schema,
                stitchingInfo,
                returnTypeName,
                sel,
                fragments,
                variableValues,
                [rootKey],
                incompleteReasons,
              ),
            );
          }
          continue;
        }
        if (!sel.selectionSet) {
          continue;
        }
        if (!availNames.has(sel.name.value)) {
          continue;
        }
        const parentFields =
          isObjectType(returnType) || isInterfaceType(returnType)
            ? returnType.getFields()
            : undefined;
        const field = parentFields?.[sel.name.value];
        if (!field) {
          continue;
        }
        const namedReturn = getNamedType(field.type);
        if (!isAbstractType(namedReturn) && !isObjectType(namedReturn)) {
          continue;
        }
        const nestedResponseKey = sel.alias?.value ?? sel.name.value;
        if (isAbstractType(namedReturn)) {
          // @interfaceObject parent (Media on C): hop on the interface type
          // first - concrete Video has no edge from C, but Media -> A does.
          const absMerged = stitchingInfo.mergedTypes[namedReturn.name];
          if (absMerged?.targetSubschemas != null && absMerged.targetSubschemas.size > 0) {
            const child = planMergedTypeFollowUps(
              schema,
              stitchingInfo,
              namedReturn.name,
              p.owner,
              [],
              fragments,
              variableValues,
              [rootKey, nestedResponseKey],
              incompleteReasons,
              sel.selectionSet.selections,
            );
            if (child) {
              partialUnavailableFollowUps.push(child);
              continue;
            }
          }
          for (const concrete of schema.getPossibleTypes(namedReturn)) {
            if (!stitchingInfo.mergedTypes[concrete.name]) {
              continue;
            }
            const forConcrete = collectFieldsForConcreteType(
              namedReturn,
              concrete,
              sel.selectionSet,
              fragments,
              schema,
            );
            if (!forConcrete.length) {
              continue;
            }
            const child = planMergedTypeFollowUps(
              schema,
              stitchingInfo,
              concrete.name,
              p.owner,
              forConcrete,
              fragments,
              variableValues,
              [rootKey, nestedResponseKey],
              incompleteReasons,
            );
            if (child) {
              partialUnavailableFollowUps.push(child);
            }
          }
        } else if (isObjectType(namedReturn) && stitchingInfo.mergedTypes[namedReturn.name]) {
          // Nested object remainder. Prefer a parent-entity hop (Hive QP:
          // Book ← author { name }), not a hop onto a non-merged child type.
          const nestedFields = flattenToFieldNodes(sel.selectionSet.selections, fragments);
          const parentHop = planMergedTypeFollowUps(
            schema,
            stitchingInfo,
            namedReturn.name,
            p.owner,
            nestedFields,
            fragments,
            variableValues,
            [rootKey, nestedResponseKey],
            incompleteReasons,
          );
          if (parentHop) {
            partialUnavailableFollowUps.push(parentHop);
            continue;
          }
          // parent-entity-call: Category.details is only reachable via Product
          // on C - delegationPlanBuilder returns empty for Category/Product
          // from A. Scan subgraphs for an entity that can satisfy the nested
          // path (Hive: Product -> C { category { details } }).
          if (
            returnTypeName &&
            stitchingInfo.mergedTypes[returnTypeName] &&
            sel.kind === Kind.FIELD
          ) {
            const enclosingHop = planParentEntityNestedHop(
              schema,
              stitchingInfo,
              returnTypeName,
              p.owner,
              sel,
              [rootKey],
              fragments,
            );
            if (enclosingHop) {
              partialUnavailableFollowUps.push(enclosingHop);
              continue;
            }
          }
          // Fall back: deeper merged child (categories.subCategories { name }).
          for (const nestedFn of nestedFields) {
            if (!nestedFn.selectionSet) {
              continue;
            }
            const nestedFieldDef = namedReturn.getFields()[nestedFn.name.value];
            if (!nestedFieldDef) {
              continue;
            }
            const nestedNamed = getNamedType(nestedFieldDef.type);
            if (!isObjectType(nestedNamed) && !isAbstractType(nestedNamed)) {
              continue;
            }
            if (!stitchingInfo.mergedTypes[nestedNamed.name]) {
              continue;
            }
            const deepFields = flattenToFieldNodes(nestedFn.selectionSet.selections, fragments);
            if (isAbstractType(nestedNamed)) {
              for (const concrete of schema.getPossibleTypes(nestedNamed)) {
                if (!stitchingInfo.mergedTypes[concrete.name]) {
                  continue;
                }
                const forConcrete = collectFieldsForConcreteType(
                  nestedNamed,
                  concrete,
                  nestedFn.selectionSet,
                  fragments,
                  schema,
                );
                if (!forConcrete.length) {
                  continue;
                }
                const child = planMergedTypeFollowUps(
                  schema,
                  stitchingInfo,
                  concrete.name,
                  p.owner,
                  forConcrete,
                  fragments,
                  variableValues,
                  [rootKey, nestedResponseKey, nestedFn.alias?.value ?? nestedFn.name.value],
                  incompleteReasons,
                );
                if (child) {
                  partialUnavailableFollowUps.push(child);
                }
              }
            } else {
              const child = planMergedTypeFollowUps(
                schema,
                stitchingInfo,
                nestedNamed.name,
                p.owner,
                deepFields,
                fragments,
                variableValues,
                [rootKey, nestedResponseKey, nestedFn.alias?.value ?? nestedFn.name.value],
                incompleteReasons,
              );
              if (child) {
                partialUnavailableFollowUps.push(child);
              }
            }
          }
        }
      }
    }
  }

  const nestedPrereqNode = (): StitchPlanNode | null => {
    if (!partialUnavailableFollowUps.length) {
      return null;
    }
    return partialUnavailableFollowUps.length === 1
      ? partialUnavailableFollowUps[0]!
      : { kind: 'Parallel' as const, nodes: partialUnavailableFollowUps };
  };

  /**
   * Hive QP orders key-providing nested hops (Product.pid via LINK) before
   * parent-entity hops that need those keys (ProductList -> LIST). Sequence:
   * root -> nested prereqs -> parent follow-ups.
   */
  const sequenceRootFollowUps = (
    rooted: StitchPlanNode,
    followUp: StitchPlanNode | null,
  ): StitchPlanNode => {
    const parts: StitchPlanNode[] = [rooted];
    const prereq = nestedPrereqNode();
    if (prereq) {
      parts.push(prereq);
    }
    if (followUp) {
      parts.push(followUp);
    }
    return parts.length === 1 ? parts[0]! : { kind: 'Sequence', nodes: parts };
  };

  // Interface/union returns:
  // - @interfaceObject (NodeWithName): plan entity hops on the interface type
  //   when it has targetSubschemas; concrete fields go as `... on User { age }`.
  // - Product-style interfaces with empty targets: fan out per concrete type.
  if (
    returnType &&
    isAbstractType(returnType) &&
    fieldNode.selectionSet &&
    (isInterfaceType(returnType) || isUnionType(returnType))
  ) {
    const absMerged = stitchingInfo.mergedTypes[returnType.name];
    const interfaceHasTargets =
      absMerged?.targetSubschemas != null && absMerged.targetSubschemas.size > 0;

    if (interfaceHasTargets && isInterfaceType(returnType)) {
      const interfaceFields: FieldNode[] = [];
      const concreteFragments: SelectionNode[] = [];
      let clientHasConcreteFragments = false;
      for (const sel of fieldNode.selectionSet.selections) {
        if (sel.kind === Kind.FIELD) {
          if (sel.name.value !== '__typename' && !isFieldCovered(sel.name.value, returnType.name)) {
            interfaceFields.push(sel);
          }
        } else if (sel.kind === Kind.INLINE_FRAGMENT) {
          const cond = sel.typeCondition?.name.value;
          if (!cond) {
            continue;
          }
          if (cond !== returnType.name) {
            clientHasConcreteFragments = true;
          }
          const nested = flattenToFieldNodes(sel.selectionSet.selections, fragments).filter(
            fn => fn.name.value !== '__typename' && !isFieldCovered(fn.name.value, cond),
          );
          if (!nested.length) {
            // Still keep a typename probe so Cast can resolve Admin vs Regular
            // when the interface-object root already covered every field.
            if (cond !== returnType.name) {
              concreteFragments.push({
                ...sel,
                selectionSet: selectionSetOf([
                  {
                    kind: Kind.FIELD,
                    name: { kind: Kind.NAME, value: '__typename' },
                  },
                ]),
              });
            }
            continue;
          }
          if (cond === returnType.name) {
            interfaceFields.push(...nested);
          } else {
            concreteFragments.push({
              ...sel,
              selectionSet: selectionSetOf(nested),
            });
          }
        } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
          const fragment = fragments[sel.name.value];
          if (!fragment) {
            continue;
          }
          const cond = fragment.typeCondition.name.value;
          if (cond !== returnType.name) {
            clientHasConcreteFragments = true;
          }
          const nested = flattenToFieldNodes(fragment.selectionSet.selections, fragments).filter(
            fn => fn.name.value !== '__typename' && !isFieldCovered(fn.name.value, cond),
          );
          if (!nested.length) {
            if (cond !== returnType.name) {
              concreteFragments.push({
                kind: Kind.INLINE_FRAGMENT,
                typeCondition: fragment.typeCondition,
                selectionSet: selectionSetOf([
                  {
                    kind: Kind.FIELD,
                    name: { kind: Kind.NAME, value: '__typename' },
                  },
                ]),
              });
            }
            continue;
          }
          if (cond === returnType.name) {
            interfaceFields.push(...nested);
          } else {
            concreteFragments.push({
              kind: Kind.INLINE_FRAGMENT,
              typeCondition: fragment.typeCondition,
              selectionSet: selectionSetOf(nested),
            });
          }
        }
      }

      // Expand requires bridges for interface fields onto the root Fetch.
      const bridgeFragments: SelectionNode[] = [];
      if (interfaceFields.length) {
        const withDeps = expandFieldDependencies(stitchingInfo, returnType.name, interfaceFields);
        const bridge = withDeps.filter(
          fn =>
            !isFieldCovered(fn.name.value, returnType.name) &&
            !interfaceFields.some(m => m.name.value === fn.name.value) &&
            fieldAvailableOnSubschema(primary, returnType.name, fn.name.value),
        );
        for (const b of bridge) {
          markCovered(b.name.value, returnType.name);
          bridgeFragments.push(b);
        }
      }

      let rooted = rootNode;
      if (bridgeFragments.length) {
        rooted = injectSelectionsIntoRootFetches(rootNode, bridgeFragments);
      }

      let child = planMergedTypeFollowUps(
        schema,
        stitchingInfo,
        returnType.name,
        primary,
        interfaceFields,
        fragments,
        variableValues,
        [responseKey],
        incompleteReasons,
        concreteFragments,
      );

      // Interface-object roots often already own every selected field; still hop
      // to a concrete-implementer subgraph so `... on Admin` can discriminate.
      if (
        !child &&
        clientHasConcreteFragments &&
        isInterfaceObjectOwner(primary, returnType, schema)
      ) {
        const concreteOwner = findConcreteImplementerSubschema(
          absMerged,
          primary,
          returnType,
          schema,
        );
        if (concreteOwner) {
          child = {
            kind: 'Fetch',
            subschema: concreteOwner,
            entityTypeName: returnType.name,
            selectionSet: ensureTypename(selectionSetOf([])),
            flattenPaths: [[responseKey]],
          };
        }
      }

      // Also resolve concrete __typename when the client explicitly asks for it
      // on an interface-object (Account.__typename -> Admin/Regular via subgraph A).
      const clientRequestsTypename = fieldNode.selectionSet.selections.some(
        sel => sel.kind === Kind.FIELD && sel.name.value === '__typename',
      );
      if (!child && clientRequestsTypename && isInterfaceObjectOwner(primary, returnType, schema)) {
        const concreteOwner = findConcreteImplementerSubschema(
          absMerged,
          primary,
          returnType,
          schema,
        );
        if (concreteOwner) {
          child = {
            kind: 'Fetch',
            subschema: concreteOwner,
            entityTypeName: returnType.name,
            selectionSet: ensureTypename(selectionSetOf([])),
            flattenPaths: [[responseKey]],
          };
        }
      }

      if (child) {
        const keySels = mergeKeySelectionsForType(
          absMerged!,
          primary,
          returnType.name,
          coveredNames,
        );
        const withKeys = keySels.length
          ? injectSelectionsIntoRootFetches(rooted, keySels, {
              stitchingInfo,
              gatewaySchema: schema,
              parentTypeName: returnType.name,
            })
          : rooted;
        return sequenceRootFollowUps(withKeys, child);
      }
      return sequenceRootFollowUps(rooted, null);
    }

    const concreteFollowUps: StitchPlanNode[] = [];
    const bridgeFragments: SelectionNode[] = [];
    for (const concrete of schema.getPossibleTypes(returnType)) {
      if (!stitchingInfo.mergedTypes[concrete.name]) {
        continue;
      }
      const forConcrete = collectFieldsForConcreteType(
        returnType,
        concrete,
        fieldNode.selectionSet,
        fragments,
        schema,
      );
      const missing = forConcrete.filter(
        fn => fn.name.value !== '__typename' && !isFieldCovered(fn.name.value, concrete.name),
      );
      if (!missing.length) {
        continue;
      }
      const withDeps = expandFieldDependencies(stitchingInfo, concrete.name, missing);
      const bridge = withDeps.filter(
        fn =>
          fn.name.value !== '__typename' &&
          !isFieldCovered(fn.name.value, concrete.name) &&
          !missing.some(m => m.name.value === fn.name.value) &&
          fieldAvailableOnSubschema(primary, concrete.name, fn.name.value),
      );
      // Only inject concrete fragments that the subgraph can spread under the
      // abstract parent (Hive QP never sends `... on Oven` under Node on A).
      if (bridge.length && canSpreadOnSubschema(primary, returnType.name, concrete.name)) {
        bridgeFragments.push({
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: { kind: Kind.NAME, value: concrete.name },
          },
          selectionSet: selectionSetOf(bridge),
        });
        // Do not add type-conditioned bridge fields to the shared coveredNames
        // set - Book.dimensions must not suppress Magazine.dimensions.
      }
      const child = planMergedTypeFollowUps(
        schema,
        stitchingInfo,
        concrete.name,
        primary,
        missing,
        fragments,
        variableValues,
        [responseKey],
        incompleteReasons,
      );
      if (child) {
        concreteFollowUps.push(child);
      }
    }

    let rooted = rootNode;
    if (bridgeFragments.length) {
      rooted = injectSelectionsIntoRootFetches(rootNode, bridgeFragments, {
        stitchingInfo,
        gatewaySchema: schema,
        parentTypeName: returnType.name,
      });
    }

    if (concreteFollowUps.length === 1) {
      return sequenceRootFollowUps(rooted, concreteFollowUps[0]!);
    }
    if (concreteFollowUps.length > 1) {
      return sequenceRootFollowUps(rooted, {
        kind: 'Parallel',
        nodes: concreteFollowUps,
      });
    }
    return sequenceRootFollowUps(rooted, null);
  }

  const followUpFieldNodes = requested.filter(fn => !isFieldCovered(fn.name.value, returnTypeName));

  if (returnTypeName && stitchingInfo.mergedTypes[returnTypeName] && followUpFieldNodes.length) {
    // Inject @requires / merge-key bridges onto the root Fetch even when the
    // parent field name is already covered (e.g. client asked for
    // `data { __typename }` but requirer needs `data { foo ... on Bar { … } }`).
    // Duplicate field names are fine - execute/collectFields merges them.
    // Nested key fields not owned by the root subgraph (Product.pid on
    // PRODUCTS) are stripped - Hive fetches them via an earlier entity hop.
    let rooted = rootNode;
    const withDeps = expandFieldDependencies(stitchingInfo, returnTypeName, followUpFieldNodes);
    const bridges = withDeps.filter(
      fn =>
        fn.name.value !== '__typename' &&
        !followUpFieldNodes.some(m => m.name.value === fn.name.value) &&
        fieldAvailableOnSubschema(primary, returnTypeName, fn.name.value),
    );
    if (bridges.length) {
      rooted = injectSelectionsIntoRootFetches(rooted, bridges, {
        stitchingInfo,
        gatewaySchema: schema,
        parentTypeName: returnTypeName,
      });
    }

    const followUp = planMergedTypeFollowUps(
      schema,
      stitchingInfo,
      returnTypeName,
      primary,
      followUpFieldNodes,
      fragments,
      variableValues,
      [responseKey],
      incompleteReasons,
    );
    return sequenceRootFollowUps(rooted, followUp);
  }

  return sequenceRootFollowUps(rootNode, null);
}

/**
 * Build a stitch plan for one operation. Caller extracts `operation` /
 * `fragments` from the document. Variable-independent: root `@skip`/`@include`
 * are Condition nodes. Progressive override uses `activeLabels` only.
 */
export function buildStitchPlan(
  schema: GraphQLSchema,
  operation: OperationDefinitionNode,
  fragments: Record<string, FragmentDefinitionNode>,
  activeLabels?: Iterable<string> | null,
): StitchPlan {
  const incompleteReasons: string[] = [];
  const stitchingInfo = schema.extensions?.stitchingInfo as StitchingInfo | undefined;

  if (!stitchingInfo) {
    return {
      operation,
      fragments,
      root: { kind: 'Parallel', nodes: [] },
      incomplete: true,
      incompleteReasons: ['Schema is not a stitched schema'],
    };
  }

  // Subscriptions are routed to schema execute in backboneExecutor
  // (classic subscribe + type merging). Planning them here is unused.

  // Abstract / interface / union selections are planned (inline fragments on
  // root + entity hops on concrete members). Do not mark incomplete solely for
  // abstracts - Cast/Flatten gaps must fail at execute so we fix plan quality.

  const previousPlanningContext = planningContext;
  // Labels-only bag (not full request context) for override handlers.
  planningContext =
    activeLabels != null ? { [OVERRIDE_LABELS_CONTEXT_KEY]: activeLabels } : undefined;
  try {
    return buildCompletePlan(
      schema,
      stitchingInfo,
      operation,
      fragments,
      {},
      incompleteReasons,
    );
  } catch {
    return {
      operation,
      fragments,
      root: { kind: 'Parallel', nodes: [] },
      incomplete: true,
      incompleteReasons: incompleteReasons.length
        ? incompleteReasons
        : ['Plan build failed'],
    };
  } finally {
    planningContext = previousPlanningContext;
  }
}

/** Stable identity for coalescing sibling/adjacent Fetches (includes path). */
function coalesceFetchKey(node: Extract<StitchPlanNode, { kind: 'Fetch' }>): string | null {
  const sub = node.subschema.name ?? '';
  const paths = node.flattenPaths;
  if (node.entityTypeName && paths?.length) {
    return `e:${sub}:${node.entityTypeName}:${paths.map(p => p.join('\0')).join('/')}`;
  }
  if (node.rootField) {
    const rk = node.rootField.alias?.value ?? node.rootField.name.value;
    return `r:${sub}:${rk}`;
  }
  return null;
}

function selectionIdentity(sel: SelectionNode): string {
  if (sel.kind === Kind.FIELD) {
    const args = sel.arguments?.length
      ? JSON.stringify(sel.arguments.map(a => [a.name.value, a.value]))
      : '';
    return `f:${sel.alias?.value ?? ''}:${sel.name.value}:${args}`;
  }
  if (sel.kind === Kind.INLINE_FRAGMENT) {
    return `i:${sel.typeCondition?.name.value ?? ''}`;
  }
  if (sel.kind === Kind.FRAGMENT_SPREAD) {
    return `s:${sel.name.value}`;
  }
  return '?';
}

function selectionSetKey(ss: SelectionSetNode): string {
  return ss.selections.map(selectionIdentity).join(',');
}

/** Batch key ignores flatten path - same entity selection across paths. */
function entityBatchKey(node: Extract<StitchPlanNode, { kind: 'Fetch' }>): string | null {
  if (node.rootField || !node.entityTypeName) {
    return null;
  }
  if (!node.flattenPaths?.length) {
    return null;
  }
  return `${node.subschema.name ?? ''}|${node.entityTypeName}|${selectionSetKey(node.selectionSet)}|${runIfKey(node.runIf)}`;
}

/** Same subgraph entity (selection/path ignored) - candidate for field union. */
function entityTypeKey(node: Extract<StitchPlanNode, { kind: 'Fetch' }>): string | null {
  if (node.rootField || !node.entityTypeName) {
    return null;
  }
  if (!fetchFlattenPaths(node).length) {
    return null;
  }
  return `${node.subschema.name ?? ''}|${node.entityTypeName}|${runIfKey(node.runIf)}`;
}

function fieldResponseKey(field: FieldNode): string {
  return field.alias?.value ?? field.name.value;
}

function fieldArgsKey(field: FieldNode): string {
  if (!field.arguments?.length) {
    return '';
  }
  return JSON.stringify(field.arguments.map(a => [a.name.value, a.value]));
}

function pathsHaveNesting(paths: PathSegment[][]): boolean {
  for (let i = 0; i < paths.length; i++) {
    for (let j = 0; j < paths.length; j++) {
      if (i !== j && pathIsPrefix(paths[i]!, paths[j]!)) {
        return true;
      }
    }
  }
  return false;
}

function pathsEqual(a: PathSegment[], b: PathSegment[]): boolean {
  return a.length === b.length && a.every((seg, i) => seg === b[i]);
}

/** Locate merge field config on this subschema (or same-name entry splits). */
function findMergeFieldConfig(
  stitchingInfo: StitchingInfo,
  subschema: Subschema,
  typeName: string,
  fieldName: string,
) {
  const direct = subschema.merge?.[typeName]?.fields?.[fieldName];
  if (direct?.selectionSet || direct?.computed) {
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

/** @requires bridge field nodes for one client field on a merge target. */
function requiresDepsForField(
  stitchingInfo: StitchingInfo,
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
  return stitchingInfo.fieldNodesByField?.[typeName]?.[fieldName] ?? [];
}

/**
 * Collect @requires deps for every field in a Fetch selection. Used both for
 * selection-union safety (arg conflicts) and wave dependency edges.
 */
function collectRequiresDeps(
  stitchingInfo: StitchingInfo,
  fetch: Extract<StitchPlanNode, { kind: 'Fetch' }>,
): FieldNode[] {
  if (!fetch.entityTypeName) {
    return [];
  }
  const deps: FieldNode[] = [];
  for (const sel of fetch.selectionSet.selections) {
    if (sel.kind !== Kind.FIELD) {
      continue;
    }
    deps.push(
      ...requiresDepsForField(stitchingInfo, fetch.subschema, fetch.entityTypeName, sel.name.value),
    );
  }
  return deps;
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

/**
 * True when two selections can share one _entities Fetch: no @requires key
 * argument conflicts (requires-with-argument-conflict must stay split).
 */
function requiresArgsCompatible(
  stitchingInfo: StitchingInfo,
  a: Extract<StitchPlanNode, { kind: 'Fetch' }>,
  b: Extract<StitchPlanNode, { kind: 'Fetch' }>,
): boolean {
  const byName = new Map<string, string>();
  for (const dep of [
    ...collectRequiresDeps(stitchingInfo, a),
    ...collectRequiresDeps(stitchingInfo, b),
  ]) {
    const args = fieldArgsKey(dep);
    const prev = byName.get(dep.name.value);
    if (prev != null && prev !== args) {
      return false;
    }
    byName.set(dep.name.value, args);
  }
  return true;
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
    byKey.set(selectionIdentity(sel), sel);
  };
  for (const sel of a.selections) {
    add(sel);
  }
  for (const sel of b.selections) {
    add(sel);
  }
  return { kind: Kind.SELECTION_SET, selections: [...byKey.values()] };
}

/**
 * Merge entity Fetches on the same subgraph type into one multi-path Fetch
 * with a unioned selection when @requires keys don't conflict.
 */
function tryUnionEntityFetches(
  stitchingInfo: StitchingInfo,
  fetches: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>>,
): Extract<StitchPlanNode, { kind: 'Fetch' }> | null {
  if (fetches.length < 2) {
    return null;
  }
  const typeKey = entityTypeKey(fetches[0]!);
  if (!typeKey || fetches.some(f => entityTypeKey(f) !== typeKey)) {
    return null;
  }
  const pathMap = new Map<string, PathSegment[]>();
  for (const p of fetches.flatMap(fetchFlattenPaths)) {
    pathMap.set(p.join('\0'), p);
  }
  const paths = [...pathMap.values()];
  if (!paths.length || pathsHaveNesting(paths)) {
    return null;
  }
  // Do not union different field sets across different flatten paths when any
  // side has @requires - that would schedule shippingEstimate on deep paths
  // before PRODUCTS weight is available (Hive keeps those waves separate).
  const pathKeys = new Set(
    fetches.map(f =>
      fetchFlattenPaths(f)
        .map(p => p.join('\0'))
        .sort()
        .join('/'),
    ),
  );
  const requiresCounts = fetches.map(f => collectRequiresDeps(stitchingInfo, f).length);
  const fetchesWithRequires = requiresCounts.filter(n => n > 0).length;
  // At most one hop in the union may carry @requires fields. This allows
  // inStock (no requires) ∪ shippingEstimate, but keeps requires-circular /
  // requires-with-argument sibling computed fields in separate Fetches.
  if (fetchesWithRequires > 1) {
    return null;
  }
  if (pathKeys.size > 1 && fetchesWithRequires > 0) {
    return null;
  }
  for (let i = 0; i < fetches.length; i++) {
    for (let j = i + 1; j < fetches.length; j++) {
      if (!requiresArgsCompatible(stitchingInfo, fetches[i]!, fetches[j]!)) {
        return null;
      }
      if (!selectionsCompatibleForUnion(fetches[i]!.selectionSet, fetches[j]!.selectionSet)) {
        return null;
      }
    }
  }
  let selectionSet = fetches[0]!.selectionSet;
  for (let i = 1; i < fetches.length; i++) {
    selectionSet = unionSelectionSets(selectionSet, fetches[i]!.selectionSet);
  }
  // Reject unions where one selected field @requires another selected
  // computed field (requires-circular: byExpert needs byNovice first).
  const selected = collectSelectedFieldNames(selectionSet);
  // Prefer the computed-isolation Subschema clone that owns @requires fields
  // (shippingEstimate). The base INVENTORY clone has empty merge.fields and
  // would omit price/weight from representations if used for the union.
  let template = fetches[0]!;
  for (let i = 0; i < fetches.length; i++) {
    if (requiresCounts[i]! > 0) {
      template = fetches[i]!;
      break;
    }
  }
  for (const name of selected) {
    const deps = requiresDepsForField(
      stitchingInfo,
      template.subschema,
      template.entityTypeName!,
      name,
    );
    for (const dep of deps) {
      if (dep.name.value === name || !selected.has(dep.name.value)) {
        continue;
      }
      const depMerge = findMergeFieldConfig(
        stitchingInfo,
        template.subschema,
        template.entityTypeName!,
        dep.name.value,
      );
      if (depMerge?.selectionSet || depMerge?.computed) {
        return null;
      }
    }
  }
  const subschema = resolveSubschemaForUnion(stitchingInfo, template, selected);
  let runIf = fetches[0]!.runIf;
  for (let i = 1; i < fetches.length; i++) {
    runIf = orRunIf(runIf, fetches[i]!.runIf);
  }
  return {
    kind: 'Fetch',
    subschema,
    entityTypeName: template.entityTypeName,
    selectionSet,
    flattenPaths: paths,
    runIf,
  };
}

/**
 * Pick the Subschema whose merge.fields covers computed/@requires fields in
 * the unioned selection (same-name entry-point splits).
 */
function resolveSubschemaForUnion(
  stitchingInfo: StitchingInfo,
  template: Extract<StitchPlanNode, { kind: 'Fetch' }>,
  selected: ReadonlySet<string>,
): Subschema {
  const typeName = template.entityTypeName!;
  const direct = template.subschema.merge?.[typeName]?.fields;
  for (const name of selected) {
    const f = direct?.[name];
    if (f?.selectionSet || f?.computed) {
      return template.subschema;
    }
  }
  for (const s of stitchingInfo.subschemaMap.values()) {
    if (template.subschema.name && s.name !== template.subschema.name) {
      continue;
    }
    const fields = s.merge?.[typeName]?.fields;
    if (!fields) {
      continue;
    }
    for (const name of selected) {
      const f = fields[name];
      if (f?.selectionSet || f?.computed) {
        return s;
      }
    }
  }
  return template.subschema;
}

/**
 * True when `selectionSet` nests fields matching `suffix` (path segments after
 * an earlier flatten path). Entity hops only "produce" deeper paths when their
 * selection actually returns those nested objects - hydrating inStock on
 * Product does not create Product.reviews.author.
 */
function selectionProducesPathSuffix(
  selectionSet: SelectionSetNode,
  suffix: PathSegment[],
): boolean {
  if (!suffix.length) {
    return true;
  }
  const head = suffix[0];
  if (typeof head !== 'string') {
    return selectionProducesPathSuffix(selectionSet, suffix.slice(1));
  }
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.INLINE_FRAGMENT) {
      // Abstract parent selections nest entity paths under inline fragments
      // (`blocks { ... on BrandSpotlight { brand { … } } }`). Skipping them
      // left nested entity hops with empty dependsOn (wave-0 races).
      if (selectionProducesPathSuffix(sel.selectionSet, suffix)) {
        return true;
      }
      continue;
    }
    if (sel.kind !== Kind.FIELD) {
      continue;
    }
    const key = sel.alias?.value ?? sel.name.value;
    if (key !== head) {
      continue;
    }
    if (suffix.length === 1) {
      return true;
    }
    if (sel.selectionSet) {
      return selectionProducesPathSuffix(sel.selectionSet, suffix.slice(1));
    }
  }
  return false;
}

/** True when the selection names the first segment of `suffix` as a field. */
function selectionTouchesPathSuffix(
  selectionSet: SelectionSetNode,
  suffix: PathSegment[],
): boolean {
  if (!suffix.length) {
    return false;
  }
  const head = suffix[0];
  if (typeof head !== 'string') {
    return selectionTouchesPathSuffix(selectionSet, suffix.slice(1));
  }
  for (const sel of selectionSet.selections) {
    if (sel.kind !== Kind.FIELD) {
      continue;
    }
    if ((sel.alias?.value ?? sel.name.value) === head) {
      return true;
    }
  }
  return false;
}

/**
 * Does `later` need `earlier` to complete first? Path production or @requires.
 */
function fetchDependsOn(
  stitchingInfo: StitchingInfo,
  later: Extract<StitchPlanNode, { kind: 'Fetch' }>,
  earlier: Extract<StitchPlanNode, { kind: 'Fetch' }>,
): boolean {
  const laterPaths = fetchFlattenPaths(later);
  const earlierPaths = fetchFlattenPaths(earlier);
  if (earlier.rootField) {
    const rk = earlier.rootField.alias?.value ?? earlier.rootField.name.value;
    // Root Fetch produces the top segment; also check nested selection under it.
    for (const lp of laterPaths) {
      if (lp[0] !== rk) {
        continue;
      }
      if (lp.length === 1) {
        return true;
      }
      if (selectionProducesPathSuffix(earlier.selectionSet, lp.slice(1))) {
        return true;
      }
    }
  }

  for (const lp of laterPaths) {
    for (const ep of earlierPaths) {
      if (!pathIsPrefix(ep, lp)) {
        continue;
      }
      const suffix = lp.slice(ep.length);
      if (selectionProducesPathSuffix(earlier.selectionSet, suffix)) {
        return true;
      }
    }
  }

  // Same-path key bridge: earlier selects a field later needs as an
  // entity key (Book.id on B before C.author; Product.pid on LINK before PRICE).
  if (entityKeyDependsOn(stitchingInfo, later, earlier)) {
    return true;
  }
  // Nested key enrichment: ProductList@{topProducts} keys on
  // `products { id pid }` so LINK@products must complete first.
  if (nestedEntityKeyDependsOn(stitchingInfo, later, earlier)) {
    return true;
  }

  const reqDeps = collectRequiresDeps(stitchingInfo, later).filter(
    d => d.name.value !== '__typename',
  );
  if (!reqDeps.length) {
    return false;
  }
  const reqNames = new Set(reqDeps.map(d => d.name.value));

  // Nested requires provider: earlier sits under later's path
  // (Post@feed needs Author@feed.author for byNovice @requires author { … }).
  for (const lp of laterPaths) {
    for (const ep of earlierPaths) {
      if (!(pathIsPrefix(lp, ep) && ep.length > lp.length)) {
        continue;
      }
      const childKey = String(ep[lp.length]);
      if (reqDeps.some(d => (d.alias?.value ?? d.name.value) === childKey)) {
        return true;
      }
    }
  }

  const provided = collectSelectedFieldNames(earlier.selectionSet);
  provided.delete('__typename');
  let providesNeeded = false;
  for (const n of reqNames) {
    if (provided.has(n)) {
      providesNeeded = true;
      break;
    }
  }
  if (!providesNeeded) {
    return false;
  }
  // Requires edge only if paths relate (same / ancestor / root).
  if (earlier.rootField) {
    const rk = earlier.rootField.alias?.value ?? earlier.rootField.name.value;
    if (laterPaths.some(lp => lp[0] === rk)) {
      return true;
    }
  }
  for (const lp of laterPaths) {
    for (const ep of earlierPaths) {
      // earlier must be at the same path or an ancestor path of later -
      // a deeper Fetch cannot satisfy requires for a shallower one.
      if (pathsEqual(lp, ep) || pathIsPrefix(ep, lp)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * True when `earlier` sits under `later`'s path and provides fields that
 * appear in `later`'s nested entity-key selection (e.g. ProductList.products
 * keys need `pid` from a Product hop at `…/products`).
 */
function nestedEntityKeyDependsOn(
  stitchingInfo: StitchingInfo,
  later: Extract<StitchPlanNode, { kind: 'Fetch' }>,
  earlier: Extract<StitchPlanNode, { kind: 'Fetch' }>,
): boolean {
  if (!later.entityTypeName || !earlier.entityTypeName) {
    return false;
  }
  const merged = stitchingInfo.mergedTypes[later.entityTypeName];
  const keySels = keySelectionSetsForSubschema(merged, later.subschema);
  if (!keySels.length) {
    return false;
  }
  const laterPaths = fetchFlattenPaths(later);
  const earlierPaths = fetchFlattenPaths(earlier);
  const provided = collectSelectedFieldNames(earlier.selectionSet);
  provided.delete('__typename');
  if (!provided.size) {
    return false;
  }
  for (const keySel of keySels) {
    for (const lp of laterPaths) {
      for (const ep of earlierPaths) {
        if (!(pathIsPrefix(lp, ep) && ep.length > lp.length)) {
          continue;
        }
        const suffix = ep.slice(lp.length).map(String);
        let cursor: SelectionSetNode | undefined = keySel;
        for (let i = 0; i < suffix.length; i++) {
          if (!cursor) {
            break;
          }
          const seg = suffix[i]!;
          let next: SelectionSetNode | undefined;
          for (const sel of cursor.selections) {
            if (sel.kind !== Kind.FIELD) {
              continue;
            }
            const key = sel.alias?.value ?? sel.name.value;
            if (key !== seg && sel.name.value !== seg) {
              continue;
            }
            if (i === suffix.length - 1) {
              // earlier is at this key field - need any nested key leaf it provides.
              if (!sel.selectionSet) {
                if (provided.has(sel.name.value)) {
                  return true;
                }
                break;
              }
              for (const leaf of sel.selectionSet.selections) {
                if (
                  leaf.kind === Kind.FIELD &&
                  leaf.name.value !== '__typename' &&
                  provided.has(leaf.name.value)
                ) {
                  return true;
                }
              }
            }
            next = sel.selectionSet;
            break;
          }
          cursor = next;
        }
      }
    }
  }
  return false;
}

function keySelectionSetsForSubschema(
  merged: StitchingInfo['mergedTypes'][string] | undefined,
  subschema: Subschema,
): SelectionSetNode[] {
  if (!merged) {
    return [];
  }
  const entrySels = merged.entryPointSelectionSets?.get(subschema);
  if (entrySels != null && entrySels.length > 0) {
    return entrySels;
  }
  const single = merged.selectionSets.get(subschema);
  return single != null ? [single] : [];
}

/**
 * True when `earlier` at the same entity path selects a merge-key field that
 * `later`'s subschema needs to build `_entities` representations.
 */
function entityKeyDependsOn(
  stitchingInfo: StitchingInfo,
  later: Extract<StitchPlanNode, { kind: 'Fetch' }>,
  earlier: Extract<StitchPlanNode, { kind: 'Fetch' }>,
): boolean {
  if (!later.entityTypeName || !earlier.entityTypeName) {
    return false;
  }
  if (later.entityTypeName !== earlier.entityTypeName) {
    return false;
  }
  const laterPaths = fetchFlattenPaths(later);
  const earlierPaths = fetchFlattenPaths(earlier);
  let samePath = false;
  for (const lp of laterPaths) {
    for (const ep of earlierPaths) {
      if (pathsEqual(lp, ep)) {
        samePath = true;
        break;
      }
    }
    if (samePath) {
      break;
    }
  }
  if (!samePath) {
    return false;
  }
  const merged = stitchingInfo.mergedTypes[later.entityTypeName];
  if (!merged) {
    return false;
  }
  // Only this hop's entity key selection - do not widen to every uniqueFields
  // entry (that falsely edges LINK↔PRICE via `price` and creates cycles).
  // Multi-entryPoints: any key field from any entry can satisfy the hop.
  const keyFields = new Set<string>();
  for (const keySel of keySelectionSetsForSubschema(merged, later.subschema)) {
    for (const sel of keySel.selections) {
      if (sel.kind === Kind.FIELD && sel.name.value !== '__typename') {
        keyFields.add(sel.name.value);
      }
    }
  }
  if (!keyFields.size) {
    return false;
  }
  const provided = collectSelectedFieldNames(earlier.selectionSet);
  const laterSelects = collectSelectedFieldNames(later.selectionSet);
  for (const k of keyFields) {
    if (!provided.has(k)) {
      continue;
    }
    // Parent object gains `k` from earlier; later's representations need it.
    // Skip when later already selects `k` (it can carry its own key).
    if (laterSelects.has(k)) {
      continue;
    }
    return true;
  }
  return false;
}

/**
 * Absorb overlapping same-subgraph entity fields across two Fetches without
 * sinking a @requires hop earlier than its providers. Non-requires fields
 * (inStock) join the requires-bearing hop (shippingEstimate) at that hop's
 * existing position - matching Hive's single inventory selection.
 */
function tryAbsorbFetches(
  stitchingInfo: StitchingInfo,
  earlier: Extract<StitchPlanNode, { kind: 'Fetch' }>,
  later: Extract<StitchPlanNode, { kind: 'Fetch' }>,
  intervening: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>>,
): {
  earlier: Extract<StitchPlanNode, { kind: 'Fetch' }> | null;
  later: Extract<StitchPlanNode, { kind: 'Fetch' }> | null;
} | null {
  if (entityTypeKey(earlier) !== entityTypeKey(later)) {
    return null;
  }
  const aPaths = fetchFlattenPaths(earlier);
  const bPaths = fetchFlattenPaths(later);
  // Identical selections on (possibly different) paths -> one multi-path Fetch
  // (topProducts inventory ∥ reviews->product inventory). Avoids duplicate
  // upstream `_entities` calls that inflate OTEL subgraph.execute counts.
  if (selectionSetKey(earlier.selectionSet) === selectionSetKey(later.selectionSet)) {
    const pathKeys = new Set(aPaths.map(p => p.join('\0')));
    const mergedPaths = [...aPaths];
    for (const p of bPaths) {
      const key = p.join('\0');
      if (!pathKeys.has(key)) {
        pathKeys.add(key);
        mergedPaths.push(p);
      }
    }
    const united: Extract<StitchPlanNode, { kind: 'Fetch' }> = {
      ...earlier,
      flattenPaths: mergedPaths,
    };
    const laterNeedsMid = intervening.some(mid => fetchDependsOn(stitchingInfo, later, mid));
    const midNeedsEarlier = intervening.some(mid => fetchDependsOn(stitchingInfo, mid, earlier));
    // Prefer dropping the hop that is safe to absorb without breaking
    // provider->requires ordering around intervening fetches.
    if (laterNeedsMid && !midNeedsEarlier) {
      return {
        earlier: null,
        later: { ...united, subschema: later.subschema },
      };
    }
    if (!laterNeedsMid) {
      return { earlier: united, later: null };
    }
    return null;
  }
  const bKeys = new Set(bPaths.map(p => p.join('\0')));
  const common = aPaths.filter(p => bKeys.has(p.join('\0')));
  if (!common.length) {
    return null;
  }
  const commonKeys = new Set(common.map(p => p.join('\0')));
  const aFullyInCommon = common.length === aPaths.length;
  const bFullyInCommon = common.length === bPaths.length;
  if (!aFullyInCommon && !bFullyInCommon) {
    return null;
  }

  const aCommon: Extract<StitchPlanNode, { kind: 'Fetch' }> = {
    ...earlier,
    flattenPaths: common,
  };
  const bCommon: Extract<StitchPlanNode, { kind: 'Fetch' }> = {
    ...later,
    flattenPaths: common,
  };
  const united = tryUnionEntityFetches(stitchingInfo, [aCommon, bCommon]);
  if (!united) {
    return null;
  }

  const aReq = collectRequiresDeps(stitchingInfo, earlier).length > 0;
  const bReq = collectRequiresDeps(stitchingInfo, later).length > 0;

  // Only later carries @requires: merge into later so requires stay after any
  // providers sitting between the two hops (deep PRODUCTS before inventory).
  if (bReq && !aReq) {
    if (!aFullyInCommon || !bFullyInCommon) {
      return null;
    }
    // Do not drop `earlier` if a hop between still needs it (requires-circular:
    // Post.author must stay before Author.yearsOfExperience before byNovice).
    for (const mid of intervening) {
      if (fetchDependsOn(stitchingInfo, mid, earlier)) {
        return null;
      }
    }
    return { earlier: null, later: united };
  }

  // Later has no @requires (or earlier already has them): merge into earlier.
  // Refuse if later still needs an intervening provider.
  for (const mid of intervening) {
    if (fetchDependsOn(stitchingInfo, later, mid)) {
      return null;
    }
  }
  if (aFullyInCommon && bFullyInCommon) {
    return { earlier: united, later: null };
  }
  if (aFullyInCommon && !bFullyInCommon) {
    const bRest = bPaths.filter(p => !commonKeys.has(p.join('\0')));
    return {
      earlier: united,
      later: {
        ...later,
        flattenPaths: bRest,
      },
    };
  }
  return null;
}

function collectEntityFetchOrders(
  node: StitchPlanNode,
  locs: Array<{
    fetch: Extract<StitchPlanNode, { kind: 'Fetch' }>;
    order: number;
  }>,
  counter: { n: number },
): void {
  if (node.kind === 'Fetch') {
    if (entityTypeKey(node)) {
      locs.push({ fetch: node, order: counter.n });
    }
    counter.n++;
    return;
  }
  if (node.kind === 'Island') {
    if (node.continue) {
      collectEntityFetchOrders(node.continue, locs, counter);
    }
    return;
  }
  if (node.kind === 'Condition') {
    if (node.ifClause) {
      collectEntityFetchOrders(node.ifClause, locs, counter);
    }
    if (node.elseClause) {
      collectEntityFetchOrders(node.elseClause, locs, counter);
    }
    return;
  }
  if (node.kind === 'Sequence' || node.kind === 'Parallel') {
    for (const child of node.nodes) {
      collectEntityFetchOrders(child, locs, counter);
    }
  }
}

function applyFetchOrderUpdates(
  node: StitchPlanNode,
  updates: Map<number, Extract<StitchPlanNode, { kind: 'Fetch' }> | null>,
  counter: { n: number },
): StitchPlanNode | null {
  if (node.kind === 'Fetch') {
    const my = counter.n++;
    if (!updates.has(my)) {
      return node;
    }
    return updates.get(my) ?? null;
  }
  if (node.kind === 'Island') {
    if (!node.continue) {
      return node;
    }
    const cont = applyFetchOrderUpdates(node.continue, updates, counter);
    if (!cont) {
      return { ...node, continue: undefined };
    }
    return { ...node, continue: cont };
  }
  if (node.kind === 'Condition') {
    return {
      ...node,
      ifClause: node.ifClause
        ? (applyFetchOrderUpdates(node.ifClause, updates, counter) ?? undefined)
        : undefined,
      elseClause: node.elseClause
        ? (applyFetchOrderUpdates(node.elseClause, updates, counter) ?? undefined)
        : undefined,
    };
  }
  if (node.kind !== 'Sequence' && node.kind !== 'Parallel') {
    return node;
  }
  const next: StitchPlanNode[] = [];
  for (const child of node.nodes) {
    const mapped = applyFetchOrderUpdates(child, updates, counter);
    if (mapped) {
      next.push(mapped);
    }
  }
  if (!next.length) {
    return null;
  }
  if (next.length === 1) {
    return next[0]!;
  }
  return { kind: node.kind, nodes: next };
}

/**
 * Hive-style same-path inventory coalesce: walk the whole plan and merge
 * overlapping entity field sets without reordering requires past providers.
 */
function coalesceSamePathEntityFields(
  root: StitchPlanNode,
  stitchingInfo: StitchingInfo,
): StitchPlanNode {
  let current = root;
  for (let iter = 0; iter < 64; iter++) {
    const locs: Array<{
      fetch: Extract<StitchPlanNode, { kind: 'Fetch' }>;
      order: number;
    }> = [];
    collectEntityFetchOrders(current, locs, { n: 0 });
    let absorbed: {
      earlierOrder: number;
      laterOrder: number;
      earlier: Extract<StitchPlanNode, { kind: 'Fetch' }> | null;
      later: Extract<StitchPlanNode, { kind: 'Fetch' }> | null;
    } | null = null;
    outer: for (let i = 0; i < locs.length; i++) {
      for (let j = i + 1; j < locs.length; j++) {
        const a = locs[i]!;
        const b = locs[j]!;
        const intervening = locs.slice(i + 1, j).map(l => l.fetch);
        const result = tryAbsorbFetches(stitchingInfo, a.fetch, b.fetch, intervening);
        if (!result) {
          continue;
        }
        absorbed = {
          earlierOrder: a.order,
          laterOrder: b.order,
          earlier: result.earlier,
          later: result.later,
        };
        break outer;
      }
    }
    if (!absorbed) {
      return current;
    }
    const updates = new Map<number, Extract<StitchPlanNode, { kind: 'Fetch' }> | null>();
    updates.set(absorbed.earlierOrder, absorbed.earlier);
    updates.set(absorbed.laterOrder, absorbed.later);
    current = applyFetchOrderUpdates(current, updates, { n: 0 }) ?? current;
  }
  return current;
}

/**
 * Pack consecutive independent entity Fetches into a Parallel wave (Hive
 * products ∥ accounts). Stops before any depends-on edge.
 */
function packIndependentSequenceFetches(
  nodes: StitchPlanNode[],
  stitchingInfo: StitchingInfo,
): StitchPlanNode[] {
  const out: StitchPlanNode[] = [];
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i]!;
    if (n.kind !== 'Fetch' || n.rootField || !entityTypeKey(n)) {
      out.push(n);
      i++;
      continue;
    }
    const group: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>> = [n];
    let j = i + 1;
    while (j < nodes.length) {
      const m = nodes[j]!;
      if (m.kind !== 'Fetch' || m.rootField || !entityTypeKey(m)) {
        break;
      }
      const blocked = group.some(g => {
        if (fetchDependsOn(stitchingInfo, m, g) || fetchDependsOn(stitchingInfo, g, m)) {
          return true;
        }
        const eitherHasRequires =
          collectRequiresDeps(stitchingInfo, g).length > 0 ||
          collectRequiresDeps(stitchingInfo, m).length > 0;
        for (const gp of fetchFlattenPaths(g)) {
          for (const mp of fetchFlattenPaths(m)) {
            if (pathsEqual(gp, mp)) {
              return true;
            }
            if (!pathIsPrefix(gp, mp) && !pathIsPrefix(mp, gp)) {
              continue;
            }
            // @requires hops stay strictly sequenced vs nested neighbors
            // (requires-circular). Leaf entity hops may share a wave when
            // paths nest (Hive accounts∥products).
            if (eitherHasRequires) {
              return true;
            }
            if (
              pathIsPrefix(gp, mp) &&
              selectionTouchesPathSuffix(g.selectionSet, mp.slice(gp.length))
            ) {
              return true;
            }
            if (
              pathIsPrefix(mp, gp) &&
              selectionTouchesPathSuffix(m.selectionSet, gp.slice(mp.length))
            ) {
              return true;
            }
          }
        }
        return false;
      });
      if (blocked) {
        break;
      }
      group.push(m);
      j++;
    }
    if (group.length > 1) {
      out.push({ kind: 'Parallel', nodes: group });
    } else {
      out.push(group[0]!);
    }
    i = j;
  }
  return out;
}

function packIndependentWaves(node: StitchPlanNode, stitchingInfo: StitchingInfo): StitchPlanNode {
  if (node.kind === 'Island') {
    return node.continue
      ? {
          ...node,
          continue: packIndependentWaves(node.continue, stitchingInfo),
        }
      : node;
  }
  if (node.kind === 'Condition') {
    return {
      ...node,
      ifClause: node.ifClause ? packIndependentWaves(node.ifClause, stitchingInfo) : undefined,
      elseClause: node.elseClause
        ? packIndependentWaves(node.elseClause, stitchingInfo)
        : undefined,
    };
  }
  if (node.kind !== 'Sequence' && node.kind !== 'Parallel') {
    return node;
  }
  const children = node.nodes.map(c => packIndependentWaves(c, stitchingInfo));
  if (node.kind === 'Parallel') {
    return children.length === 1 ? children[0]! : { kind: 'Parallel', nodes: children };
  }
  // Keep branch Sequences intact: peeling heads into Sequence barriers
  // stalls independent work (products@users waited on inventory@TP).
  const packed = packIndependentSequenceFetches(children, stitchingInfo);
  return liftTrailingInventoryPastParallelJoin(toSeqOrSingle(packed), stitchingInfo);
}

/**
 * Trailing inventory inside Parallel(Sequence…) forces the join to wait on
 * I_user even though deep accounts/products don't need it. Lift that hop out
 * and BatchFetch it with the post-join inventory wave when selections match.
 *
 *   Parallel(Seq(A,R,P,I_user), Seq(Pt,…)) ; Parallel(acc,prod) ; I_deep
 * -> Parallel(Seq(A,R,P), Seq(Pt,…)) ; Parallel(acc,prod) ; Batch(I_user,I_deep)
 */
function liftTrailingInventoryPastParallelJoin(
  node: StitchPlanNode,
  stitchingInfo: StitchingInfo,
): StitchPlanNode {
  if (node.kind !== 'Sequence' || node.nodes.length < 2) {
    return node;
  }
  const [first, ...rest] = node.nodes;
  if (first?.kind !== 'Parallel' || first.nodes.length < 2) {
    return node;
  }

  const lifted: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>> = [];
  const rewrittenBranches: StitchPlanNode[] = [];
  for (const branch of first.nodes) {
    if (branch.kind !== 'Sequence' || branch.nodes.length < 2) {
      rewrittenBranches.push(branch);
      continue;
    }
    const last = branch.nodes[branch.nodes.length - 1]!;
    // Lift trailing leaf entity hops (e.g. inventory {inStock,shippingEstimate})
    // that sibling branches don't need - they only delay the Parallel join.
    if (
      last.kind !== 'Fetch' ||
      !last.entityTypeName ||
      last.rootField ||
      !selectionIsLeafOnly(last.selectionSet)
    ) {
      rewrittenBranches.push(branch);
      continue;
    }
    const siblings = first.nodes.filter(b => b !== branch);
    if (siblings.some(sib => sequenceContainsFetchDependingOn(sib, last, stitchingInfo))) {
      rewrittenBranches.push(branch);
      continue;
    }
    lifted.push(last);
    rewrittenBranches.push(toSeqOrSingle(branch.nodes.slice(0, -1)));
  }

  if (!lifted.length) {
    return node;
  }

  const newFirst: StitchPlanNode =
    rewrittenBranches.length === 1
      ? rewrittenBranches[0]!
      : { kind: 'Parallel', nodes: rewrittenBranches };

  // Find a later inventory Fetch with the same selection to BatchFetch into.
  const nextNodes = [...rest];
  let merged = false;
  for (let i = 0; i < nextNodes.length; i++) {
    const cand = nextNodes[i]!;
    if (
      cand.kind === 'Fetch' &&
      lifted.every(
        l =>
          entityTypeKey(l) === entityTypeKey(cand) &&
          selectionSetKey(l.selectionSet) === selectionSetKey(cand.selectionSet) &&
          l.subschema === cand.subschema,
      )
    ) {
      nextNodes[i] = mergeMultiPathFetches([...lifted, cand]);
      merged = true;
      break;
    }
  }
  if (!merged) {
    // Place lifted hops just before the first post-join node that any of them
    // don't depend on - typically Parallel(accounts, products) then inventory.
    const invNode = lifted.length === 1 ? lifted[0]! : mergeMultiPathFetches(lifted);
    // Prefer appending before a trailing inventory, else at end of the
    // independent mid-wave (after first Parallel of entity hops).
    let inserted = false;
    for (let i = 0; i < nextNodes.length; i++) {
      const cand = nextNodes[i]!;
      if (
        cand.kind === 'Fetch' &&
        entityTypeKey(cand) &&
        selectionSetKey(cand.selectionSet) === selectionSetKey(invNode.selectionSet)
      ) {
        nextNodes[i] = mergeMultiPathFetches(cand.kind === 'Fetch' ? [invNode, cand] : [invNode]);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      nextNodes.push(invNode);
    }
  }

  return toSeqOrSingle([newFirst, ...nextNodes]);
}

function selectionIsLeafOnly(ss: SelectionSetNode): boolean {
  for (const sel of ss.selections) {
    if (sel.kind !== Kind.FIELD) {
      return false;
    }
    if (sel.name.value === '__typename') {
      continue;
    }
    if (sel.selectionSet?.selections.length) {
      return false;
    }
  }
  return true;
}

function sequenceContainsFetchDependingOn(
  node: StitchPlanNode,
  earlier: Extract<StitchPlanNode, { kind: 'Fetch' }>,
  stitchingInfo: StitchingInfo,
): boolean {
  if (node.kind === 'Fetch') {
    return fetchDependsOn(stitchingInfo, earlier, node);
  }
  if (node.kind === 'Sequence' || node.kind === 'Parallel') {
    return node.nodes.some(c => sequenceContainsFetchDependingOn(c, earlier, stitchingInfo));
  }
  if (node.kind === 'Island' && node.continue) {
    return sequenceContainsFetchDependingOn(node.continue, earlier, stitchingInfo);
  }
  return false;
}

function fetchFlattenPaths(node: Extract<StitchPlanNode, { kind: 'Fetch' }>): PathSegment[][] {
  if (!node.flattenPaths?.length) {
    return [];
  }
  return node.flattenPaths.map(p => [...p]);
}

function islandFlattenPaths(node: Extract<StitchPlanNode, { kind: 'Island' }>): PathSegment[][] {
  if (!node.flattenPaths?.length) {
    return [];
  }
  return node.flattenPaths.map(p => [...p]);
}

function pathIsPrefix(shorter: PathSegment[], longer: PathSegment[]): boolean {
  if (shorter.length >= longer.length) {
    return false;
  }
  return shorter.every((seg, i) => seg === longer[i]);
}

function flattenSequenceNodes(node: StitchPlanNode): StitchPlanNode[] {
  if (node.kind === 'Sequence') {
    return node.nodes.flatMap(flattenSequenceNodes);
  }
  return [node];
}

function toSeqOrSingle(nodes: StitchPlanNode[]): StitchPlanNode {
  if (nodes.length === 1) {
    return nodes[0]!;
  }
  return { kind: 'Sequence', nodes };
}

function toParOrSingle(nodes: StitchPlanNode[]): StitchPlanNode {
  if (nodes.length === 1) {
    return nodes[0]!;
  }
  return { kind: 'Parallel', nodes };
}

type BatchLoc = {
  seqIdx: number;
  /** Index in the flattened sequence (Parallel wrapper or Fetch). */
  pos: number;
  /** When set, Fetch lives inside seq[pos] Parallel at this index. */
  parallelIdx?: number;
  fetch: Extract<StitchPlanNode, { kind: 'Fetch' }>;
};

function collectBatchLocs(seqs: StitchPlanNode[][]): BatchLoc[] {
  const locs: BatchLoc[] = [];
  for (let si = 0; si < seqs.length; si++) {
    const seq = seqs[si]!;
    for (let pos = 0; pos < seq.length; pos++) {
      const n = seq[pos]!;
      if (n.kind === 'Fetch') {
        if (entityTypeKey(n) || entityBatchKey(n)) {
          locs.push({ seqIdx: si, pos, fetch: n });
        }
      } else if (n.kind === 'Parallel') {
        for (let pi = 0; pi < n.nodes.length; pi++) {
          const c = n.nodes[pi]!;
          if (c.kind === 'Fetch' && (entityTypeKey(c) || entityBatchKey(c))) {
            locs.push({
              seqIdx: si,
              pos,
              parallelIdx: pi,
              fetch: c,
            });
          }
        }
      }
    }
  }
  return locs;
}

/** Remove a batched Fetch from its sequence, returning { prefix, suffix }. */
function splitSeqAroundLoc(
  seq: StitchPlanNode[],
  loc: BatchLoc,
): { prefix: StitchPlanNode[]; suffix: StitchPlanNode[] } {
  const pos = loc.pos;
  if (loc.parallelIdx == null) {
    return {
      prefix: seq.slice(0, pos),
      suffix: seq.slice(pos + 1),
    };
  }
  const par = seq[pos]!;
  if (par.kind !== 'Parallel') {
    return { prefix: seq.slice(0, pos), suffix: seq.slice(pos + 1) };
  }
  const remaining = par.nodes.filter((_, i) => i !== loc.parallelIdx);
  const prefix = seq.slice(0, pos);
  const suffix = seq.slice(pos + 1);
  if (remaining.length === 1) {
    return {
      prefix: [...prefix, remaining[0]!],
      suffix,
    };
  }
  if (remaining.length > 1) {
    return {
      prefix: [...prefix, { kind: 'Parallel', nodes: remaining }],
      suffix,
    };
  }
  return { prefix, suffix };
}

/**
 * Hive-QP BatchFetch: across Parallel branches that are Sequences, hoist
 * identical entity selections at different flatten paths into one multi-path
 * Fetch between the prefixes and suffixes of those sequences.
 */
function tryCrossBatchSequences(
  parallelNodes: StitchPlanNode[],
  stitchingInfo?: StitchingInfo,
): StitchPlanNode | null {
  if (parallelNodes.length < 2) {
    return null;
  }
  const seqs = parallelNodes.map(n => flattenSequenceNodes(n));
  const allLocs = collectBatchLocs(seqs);
  const byKey = new Map<string, BatchLoc[]>();
  for (const loc of allLocs) {
    const key = entityBatchKey(loc.fetch);
    if (!key) {
      continue;
    }
    // Keep @requires hops on their home branch (Hive: inventory@topProducts
    // stays in wave 2 beside reviews; do not sink it past the users branch).
    if (stitchingInfo && collectRequiresDeps(stitchingInfo, loc.fetch).length > 0) {
      continue;
    }
    let list = byKey.get(key);
    if (!list) {
      list = [];
      byKey.set(key, list);
    }
    list.push(loc);
  }

  let best: BatchLoc[] | null = null;
  for (const locs of byKey.values()) {
    // Prefer the latest loc per sequence so path prefixes (e.g. PRODUCTS
    // price/weight before shippingEstimate @requires) stay in the prefix.
    const latestBySeq = new Map<number, BatchLoc>();
    for (const loc of locs) {
      const prev = latestBySeq.get(loc.seqIdx);
      if (
        !prev ||
        loc.pos > prev.pos ||
        (loc.pos === prev.pos && (loc.parallelIdx ?? 0) > (prev.parallelIdx ?? 0))
      ) {
        latestBySeq.set(loc.seqIdx, loc);
      }
    }
    const uniq = [...latestBySeq.values()];
    if (uniq.length < 2) {
      continue;
    }
    const paths = uniq.flatMap(l => fetchFlattenPaths(l.fetch));
    let nested = false;
    for (let i = 0; i < paths.length && !nested; i++) {
      for (let j = 0; j < paths.length; j++) {
        if (i !== j && pathIsPrefix(paths[i]!, paths[j]!)) {
          nested = true;
          break;
        }
      }
    }
    if (nested) {
      continue;
    }
    if (!best || uniq.length > best.length) {
      best = uniq;
    }
  }
  if (!best) {
    return null;
  }

  const batchPaths = best.flatMap(l => fetchFlattenPaths(l.fetch));
  const template = best[0]!.fetch;
  // Preserve shared runIf: entityBatchKey groups by gate, so every loc in
  // `best` shares the same gate. Dropping it would dispatch when false.
  let batchRunIf = template.runIf;
  for (let i = 1; i < best.length; i++) {
    batchRunIf = orRunIf(batchRunIf, best[i]!.fetch.runIf);
  }
  const batchFetch: Extract<StitchPlanNode, { kind: 'Fetch' }> = {
    kind: 'Fetch',
    subschema: template.subschema,
    entityTypeName: template.entityTypeName,
    selectionSet: template.selectionSet,
    flattenPaths: batchPaths,
    runIf: batchRunIf,
  };

  const locBySeq = new Map(best.map(l => [l.seqIdx, l]));
  const prefixes: StitchPlanNode[] = [];
  const suffixes: StitchPlanNode[] = [];
  const untouched: StitchPlanNode[] = [];

  for (let si = 0; si < seqs.length; si++) {
    const loc = locBySeq.get(si);
    const seq = seqs[si]!;
    if (!loc) {
      untouched.push(toSeqOrSingle(seq));
      continue;
    }
    const { prefix, suffix } = splitSeqAroundLoc(seq, loc);
    if (prefix.length) {
      prefixes.push(toSeqOrSingle(prefix));
    }
    if (suffix.length) {
      suffixes.push(toSeqOrSingle(suffix));
    }
  }

  const batchChain: StitchPlanNode[] = [];
  if (prefixes.length) {
    batchChain.push(toParOrSingle(prefixes));
  }
  batchChain.push(batchFetch);
  if (suffixes.length) {
    batchChain.push(toParOrSingle(suffixes));
  }
  const batched = toSeqOrSingle(batchChain);
  if (!untouched.length) {
    return batched;
  }
  return { kind: 'Parallel', nodes: [...untouched, batched] };
}

function mergeMultiPathFetches(
  fetches: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>>,
): Extract<StitchPlanNode, { kind: 'Fetch' }> {
  const paths = fetches.flatMap(fetchFlattenPaths);
  const template = fetches[0]!;
  let runIf = template.runIf;
  for (let i = 1; i < fetches.length; i++) {
    runIf = orRunIf(runIf, fetches[i]!.runIf);
  }
  return {
    kind: 'Fetch',
    subschema: template.subschema,
    entityTypeName: template.entityTypeName,
    selectionSet: template.selectionSet,
    flattenPaths: paths,
    runIf,
  };
}

/**
 * Plan cleanup:
 * - Flatten nested Sequence/Parallel of the same kind (except Parallel root
 *   fan-outs that must keep sameKey isolation)
 * - Drop exact-duplicate Fetches left by double nested planning
 */
function optimizeStitchPlanNode(
  node: StitchPlanNode,
  stitchingInfo: StitchingInfo,
): StitchPlanNode {
  if (node.kind === 'Island') {
    return node.continue
      ? {
          ...node,
          continue: optimizeStitchPlanNode(node.continue, stitchingInfo),
        }
      : node;
  }
  if (node.kind === 'Condition') {
    return {
      ...node,
      ifClause: node.ifClause ? optimizeStitchPlanNode(node.ifClause, stitchingInfo) : undefined,
      elseClause: node.elseClause
        ? optimizeStitchPlanNode(node.elseClause, stitchingInfo)
        : undefined,
    };
  }
  if (node.kind !== 'Sequence' && node.kind !== 'Parallel') {
    return node;
  }

  const kind = node.kind;
  const hasRootFetch = (n: StitchPlanNode): boolean => {
    if (n.kind === 'Fetch') {
      return Boolean(n.rootField);
    }
    if (n.kind === 'Parallel' || n.kind === 'Sequence') {
      return n.nodes.some(hasRootFetch);
    }
    if (n.kind === 'Condition') {
      return (
        (n.ifClause != null && hasRootFetch(n.ifClause)) ||
        (n.elseClause != null && hasRootFetch(n.elseClause))
      );
    }
    if (n.kind === 'Island') {
      return true;
    }
    return false;
  };
  const flat: StitchPlanNode[] = [];
  for (const child of node.nodes.map(c => optimizeStitchPlanNode(c, stitchingInfo))) {
    // Do not flatten Parallel groups that contain root Fetches - shared-root
    // sameKey isolation (account vs chat) requires each alias's fan-out to stay
    // in its own Parallel unit.
    if (child.kind === kind && !(kind === 'Parallel' && hasRootFetch(child))) {
      flat.push(...child.nodes);
    } else {
      flat.push(child);
    }
  }

  // Parallel: union same-subgraph entity types across paths/selections first
  // (inStock∥shippingEstimate, multi-path inventory), then multi-path merge
  // for identical selections that did not union.
  const coalesced: StitchPlanNode[] = [];
  if (kind === 'Parallel') {
    const byType = new Map<string, Array<Extract<StitchPlanNode, { kind: 'Fetch' }>>>();
    const nonEntity: StitchPlanNode[] = [];
    for (const child of flat) {
      if (child.kind !== 'Fetch' || !entityTypeKey(child)) {
        nonEntity.push(child);
        continue;
      }
      const key = entityTypeKey(child)!;
      let list = byType.get(key);
      if (!list) {
        list = [];
        byType.set(key, list);
      }
      list.push(child);
    }
    const afterUnion: StitchPlanNode[] = [...nonEntity];
    for (const group of byType.values()) {
      const united = tryUnionEntityFetches(stitchingInfo, group);
      if (united) {
        afterUnion.push(united);
      } else if (group.length === 1) {
        afterUnion.push(group[0]!);
      } else {
        // Union refused (requires / arg conflict) - still merge identical
        // selections across paths within this type.
        const bySel = new Map<string, Array<Extract<StitchPlanNode, { kind: 'Fetch' }>>>();
        for (const f of group) {
          const sk = selectionSetKey(f.selectionSet);
          let list = bySel.get(sk);
          if (!list) {
            list = [];
            bySel.set(sk, list);
          }
          list.push(f);
        }
        for (const selGroup of bySel.values()) {
          if (selGroup.length > 1 && !pathsHaveNesting(selGroup.flatMap(fetchFlattenPaths))) {
            afterUnion.push(mergeMultiPathFetches(selGroup));
          } else {
            afterUnion.push(...selGroup);
          }
        }
      }
    }
    const batchGroups = new Map<string, Array<Extract<StitchPlanNode, { kind: 'Fetch' }>>>();
    const rest: StitchPlanNode[] = [];
    const seenExact = new Set<string>();
    for (const child of afterUnion) {
      if (child.kind !== 'Fetch') {
        rest.push(child);
        continue;
      }
      const exact = coalesceFetchKey(child);
      if (exact) {
        const exactFull = `${exact}::${selectionSetKey(child.selectionSet)}`;
        if (seenExact.has(exactFull)) {
          continue;
        }
        seenExact.add(exactFull);
      }
      const bKey = entityBatchKey(child);
      if (bKey) {
        let list = batchGroups.get(bKey);
        if (!list) {
          list = [];
          batchGroups.set(bKey, list);
        }
        list.push(child);
      } else {
        rest.push(child);
      }
    }
    for (const group of batchGroups.values()) {
      if (group.length === 1) {
        coalesced.push(group[0]!);
      } else if (pathsHaveNesting(group.flatMap(fetchFlattenPaths))) {
        coalesced.push(...group);
      } else {
        coalesced.push(mergeMultiPathFetches(group));
      }
    }
    coalesced.push(...rest);
  } else {
    const seenIslands = new Set<string>();
    for (const child of flat) {
      if (child.kind === 'Island') {
        const ik = `${child.parentTypeName}.${child.fieldNode.name.value}::${islandFlattenPaths(
          child,
        )
          .map(p => p.join('\0'))
          .join('/')}::${child.fieldNode.alias?.value ?? ''}`;
        if (seenIslands.has(ik)) {
          continue;
        }
        seenIslands.add(ik);
      }
      const prev = coalesced[coalesced.length - 1];
      if (child.kind === 'Fetch' && prev?.kind === 'Fetch') {
        const a = coalesceFetchKey(prev);
        const b = coalesceFetchKey(child);
        if (
          a &&
          b &&
          a === b &&
          selectionSetKey(prev.selectionSet) === selectionSetKey(child.selectionSet)
        ) {
          continue;
        }
        const united = tryUnionEntityFetches(stitchingInfo, [prev, child]);
        if (united) {
          coalesced[coalesced.length - 1] = united;
          continue;
        }
      }
      coalesced.push(child);
    }
    const pathCoalesced = coalesceSamePathEntityFields(
      { kind: 'Sequence', nodes: coalesced },
      stitchingInfo,
    );
    const seqNodes = pathCoalesced.kind === 'Sequence' ? pathCoalesced.nodes : [pathCoalesced];
    const withinBatched = tryBatchWithinSequence(seqNodes, stitchingInfo);
    if (withinBatched) {
      return optimizeStitchPlanNode({ kind: 'Sequence', nodes: withinBatched }, stitchingInfo);
    }
    if (seqNodes.length === 1) {
      return seqNodes[0]!;
    }
    return { kind: 'Sequence', nodes: seqNodes };
  }

  if (coalesced.length === 1) {
    return coalesced[0]!;
  }

  if (kind === 'Parallel') {
    const crossBatched = tryCrossBatchSequences(coalesced, stitchingInfo);
    if (crossBatched) {
      return optimizeStitchPlanNode(crossBatched, stitchingInfo);
    }
  }

  return { kind, nodes: coalesced };
}

/**
 * Within one Sequence, merge identical entity selections at different paths
 * into one multi-path Fetch. Non-requires batches still land at the latest
 * loc (all prefixes ready). @requires batches refuse to move an early hop
 * past intervening work - that delayed topProducts inventory behind the
 * users branch and widened the Hive gap.
 */
function tryBatchWithinSequence(
  nodes: StitchPlanNode[],
  stitchingInfo: StitchingInfo,
): StitchPlanNode[] | null {
  const locs = collectBatchLocs([nodes]);
  const byKey = new Map<string, BatchLoc[]>();
  for (const loc of locs) {
    const key = entityBatchKey(loc.fetch);
    if (!key) {
      continue;
    }
    let list = byKey.get(key);
    if (!list) {
      list = [];
      byKey.set(key, list);
    }
    list.push(loc);
  }

  let best: BatchLoc[] | null = null;
  for (const group of byKey.values()) {
    if (group.length < 2) {
      continue;
    }
    const paths = group.flatMap(l => fetchFlattenPaths(l.fetch));
    const pathKeys = new Set(paths.map(p => p.join('\0')));
    if (pathKeys.size < 2) {
      continue;
    }
    if (pathsHaveNesting(paths)) {
      continue;
    }
    const sortedGroup = [...group].sort(
      (a, b) => a.pos - b.pos || (a.parallelIdx ?? 0) - (b.parallelIdx ?? 0),
    );
    const earliest = sortedGroup[0]!;
    const latest = sortedGroup[sortedGroup.length - 1]!;
    if (collectRequiresDeps(stitchingInfo, earliest.fetch).length > 0) {
      // Intervening Sequence slots (e.g. the users∥topProducts Parallel)
      // between early and late inventory - keep waves split like Hive.
      const removePos = new Set(group.map(l => l.pos));
      let intervening = false;
      for (let p = earliest.pos + 1; p < latest.pos; p++) {
        if (!removePos.has(p) && nodes[p]) {
          intervening = true;
          break;
        }
      }
      if (intervening) {
        continue;
      }
    }
    if (!best || group.length > best.length) {
      best = group;
    }
  }
  if (!best) {
    return null;
  }

  // Place batch at the latest loc; remove all group members from the sequence.
  const sorted = [...best].sort(
    (a, b) => a.pos - b.pos || (a.parallelIdx ?? 0) - (b.parallelIdx ?? 0),
  );
  const latest = sorted[sorted.length - 1]!;
  const batchPaths = best.flatMap(l => fetchFlattenPaths(l.fetch));
  const pathMap = new Map<string, PathSegment[]>();
  for (const p of batchPaths) {
    pathMap.set(p.join('\0'), p);
  }
  const dedupedPaths = [...pathMap.values()];
  const template = latest.fetch;
  const batchFetch: Extract<StitchPlanNode, { kind: 'Fetch' }> = {
    kind: 'Fetch',
    subschema: template.subschema,
    entityTypeName: template.entityTypeName,
    selectionSet: template.selectionSet,
    flattenPaths: dedupedPaths,
  };

  // Rebuild sequence: walk positions, skip removed fetches, insert batch at latest.
  const removeSet = new Set(best);
  const out: StitchPlanNode[] = [];
  for (let pos = 0; pos < nodes.length; pos++) {
    const n = nodes[pos]!;
    const locsAtPos = best.filter(l => l.pos === pos);
    if (!locsAtPos.length) {
      out.push(n);
      continue;
    }
    if (n.kind === 'Fetch') {
      // Entire node is a batched fetch - skip; insert batch when we hit latest.
      if (pos === latest.pos && latest.parallelIdx == null) {
        out.push(batchFetch);
      }
      continue;
    }
    if (n.kind === 'Parallel') {
      const removeIdx = new Set(
        locsAtPos.filter(l => l.parallelIdx != null).map(l => l.parallelIdx!),
      );
      const remaining = n.nodes.filter((_, i) => !removeIdx.has(i));
      if (pos === latest.pos) {
        // Insert batch after remaining siblings at this parallel slot.
        if (remaining.length === 1) {
          out.push(remaining[0]!);
        } else if (remaining.length > 1) {
          out.push({ kind: 'Parallel', nodes: remaining });
        }
        out.push(batchFetch);
      } else if (remaining.length === 1) {
        out.push(remaining[0]!);
      } else if (remaining.length > 1) {
        out.push({ kind: 'Parallel', nodes: remaining });
      }
      continue;
    }
    out.push(n);
  }
  void removeSet;
  return out;
}

/**
 * Expand root selections without evaluating `@skip`/`@include` (Condition path).
 * Fragment spreads / inline fragments are flattened to field nodes.
 */
function collectRootFieldNodesPreservingSkipInclude(
  selectionSet: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>,
): FieldNode[] {
  const out: FieldNode[] = [];
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      out.push(sel);
      continue;
    }
    if (sel.kind === Kind.INLINE_FRAGMENT) {
      out.push(...collectRootFieldNodesPreservingSkipInclude(sel.selectionSet, fragments));
      continue;
    }
    if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const frag = fragments[sel.name.value];
      if (frag) {
        out.push(...collectRootFieldNodesPreservingSkipInclude(frag.selectionSet, fragments));
      }
    }
  }
  return out;
}

/** Variable name for `@skip(if: $v)` / `@include(if: $v)`, else null. */
function skipIncludeVariableName(
  field: FieldNode,
  directiveName: 'skip' | 'include',
): string | null {
  const dir = field.directives?.find(d => d.name.value === directiveName);
  const arg = dir?.arguments?.find(a => a.name.value === 'if');
  if (!arg) {
    return null;
  }
  if (arg.value.kind === Kind.VARIABLE) {
    return arg.value.name.value;
  }
  return null;
}

/** Literal `@skip(if: true)` / `@include(if: false)` - never plan this field. */
function isUnconditionallyOmittedBySkipInclude(field: FieldNode): boolean {
  for (const dir of field.directives ?? []) {
    const arg = dir.arguments?.find(a => a.name.value === 'if');
    if (!arg || arg.value.kind !== Kind.BOOLEAN) {
      continue;
    }
    if (dir.name.value === 'skip' && arg.value.value === true) {
      return true;
    }
    if (dir.name.value === 'include' && arg.value.value === false) {
      return true;
    }
  }
  return false;
}

/** Strip only this field's skip/include; keep nested directives for subgraphs. */
function stripOwnSkipIncludeDirectives(field: FieldNode): FieldNode {
  const directives = field.directives?.filter(
    d => d.name.value !== 'skip' && d.name.value !== 'include',
  );
  return {
    ...field,
    directives: directives?.length ? directives : undefined,
  };
}

/**
 * Root `@include(if: $v)` / `@skip(if: $v)` become Condition nodes evaluated at
 * execute (ifClause when the variable is true, elseClause when false).
 */
function wrapRootFieldWithCondition(field: FieldNode, plan: StitchPlanNode): StitchPlanNode {
  let node = plan;
  const includeVar = skipIncludeVariableName(field, 'include');
  if (includeVar) {
    node = { kind: 'Condition', condition: includeVar, ifClause: node };
  }
  const skipVar = skipIncludeVariableName(field, 'skip');
  if (skipVar) {
    node = { kind: 'Condition', condition: skipVar, elseClause: node };
  }
  return node;
}

function buildCompletePlan(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  operation: OperationDefinitionNode,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
  incompleteReasons: string[],
): StitchPlan {
  const rootNodes: StitchPlanNode[] = [];

  // One plan per document: Condition for root `@skip`/`@include`. Nested
  // directives stay on the AST for subgraph evaluation.
  for (const fieldNode of collectRootFieldNodesPreservingSkipInclude(
    operation.selectionSet,
    fragments,
  )) {
    if (fieldNode.name.value === '__schema' || fieldNode.name.value === '__type') {
      incompleteReasons.push('Introspection requires schema execute');
      continue;
    }
    if (isUnconditionallyOmittedBySkipInclude(fieldNode)) {
      continue;
    }
    // Condition decides the root field at execute; strip only own directives so
    // nested @skip/@include remain for subgraph evaluation / provides-scope.
    const cleaned = stripOwnSkipIncludeDirectives(fieldNode);
    const planned = planRootField(
      schema,
      stitchingInfo,
      operation,
      cleaned,
      fragments,
      variableValues,
      incompleteReasons,
    );
    rootNodes.push(wrapRootFieldWithCondition(fieldNode, planned));
  }

  if (!rootNodes.length && incompleteReasons.length === 0) {
    incompleteReasons.push('Empty operation plan');
  }

  // Mutations often share subgraph state (requestId counters); root fields must
  // run in document order. Queries/subscriptions can fan out in Parallel.
  const rootRaw: StitchPlanNode =
    rootNodes.length === 1
      ? rootNodes[0]!
      : {
          kind: operation.operation === 'mutation' ? 'Sequence' : 'Parallel',
          nodes: rootNodes,
        };

  // Keep Condition nodes; execute selects the branch from variable values.
  const optimized = optimizeStitchPlanNode(rootRaw, stitchingInfo);
  const coalesced = coalesceSamePathEntityFields(optimized, stitchingInfo);
  const packed = packIndependentWaves(
    optimizeStitchPlanNode(coalesced, stitchingInfo),
    stitchingInfo,
  );
  const isMutation = operation.operation === 'mutation';
  // Mutations: encode document order into dependsOn edges.
  // Queries: peel/batch then continuous dataflow on those edges.
  const annotated = annotateFetchDeps(
    isMutation
      ? packed
      : groupParallelBatchFetches(
          compressProductsIntoDeepWave(
            peelLeadingEntityFetches(peelRootParallelHeads(packed, stitchingInfo), stitchingInfo),
            stitchingInfo,
          ),
          stitchingInfo,
        ),
    stitchingInfo,
    { serializeSequences: isMutation },
  );
  // Entity reuse is always planned for queries; mutations skip at execute.
  const withReuse = isMutation ? annotated : annotateEntityReuse(annotated);
  // Wave fold: same dependsOn wave + same subgraph → one BatchFetch
  // (or covering Fetch). Runs after reuse so reuse edges affect wave layers.
  const folded = isMutation ? withReuse : foldSameWaveSubgraphFetches(withReuse, stitchingInfo);
  const withDocs = isMutation
    ? folded
    : preparePlanDocuments(folded, {
        operation,
        fragments,
        fieldNodesByField: stitchingInfo.fieldNodesByField,
      });
  // Final plan: no Sequence barriers — flat bag + dependsOn schedule.
  const root = flattenPlanControlFlow(withDocs);
  let schedule: StitchPlan['schedule'];
  if (!planHasCondition(root)) {
    const hops = [];
    collectExecutableHops(root, hops, {});
    if (hops.length) {
      schedule = buildPlanSchedule(hops);
    }
  }
  return {
    operation,
    fragments,
    root,
    schedule,
    incomplete: incompleteReasons.length > 0,
    incompleteReasons,
  };
}

function collectExecutableFetches(
  node: StitchPlanNode,
  out: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>>,
): void {
  if (node.kind === 'Fetch') {
    out.push(node);
    return;
  }
  if (node.kind === 'BatchFetch') {
    // Expand for reschedule input - shouldn't appear before reschedule.
    for (const alias of node.aliases) {
      out.push({
        kind: 'Fetch',
        subschema: node.subschema,
        entityTypeName: alias.entityTypeName,
        selectionSet: alias.selectionSet,
        flattenPaths: alias.flattenPaths,
      });
    }
    return;
  }
  if (node.kind === 'Island') {
    if (node.continue) {
      collectExecutableFetches(node.continue, out);
    }
    return;
  }
  if (node.kind === 'Condition') {
    if (node.ifClause) {
      collectExecutableFetches(node.ifClause, out);
    }
    if (node.elseClause) {
      collectExecutableFetches(node.elseClause, out);
    }
    return;
  }
  if (node.kind === 'Sequence' || node.kind === 'Parallel') {
    for (const child of node.nodes) {
      collectExecutableFetches(child, out);
    }
  }
}

/**
 * One-level Hive peel: Parallel(Sequence(root,…), Sequence(root,…)) ->
 * Sequence(Parallel(roots), Parallel(rests)) when heads are independent
 * root Fetches. Does not peel entity hops (that starved overlapping work).
 */
function peelRootParallelHeads(node: StitchPlanNode, stitchingInfo: StitchingInfo): StitchPlanNode {
  if (node.kind === 'Island') {
    return node.continue
      ? {
          ...node,
          continue: peelRootParallelHeads(node.continue, stitchingInfo),
        }
      : node;
  }
  if (node.kind === 'Condition') {
    return {
      ...node,
      ifClause: node.ifClause ? peelRootParallelHeads(node.ifClause, stitchingInfo) : undefined,
      elseClause: node.elseClause
        ? peelRootParallelHeads(node.elseClause, stitchingInfo)
        : undefined,
    };
  }
  if (node.kind === 'Sequence') {
    return {
      kind: 'Sequence',
      nodes: node.nodes.map(c => peelRootParallelHeads(c, stitchingInfo)),
    };
  }
  if (node.kind !== 'Parallel' || node.nodes.length < 2) {
    return node.kind === 'Parallel' && node.nodes.length === 1
      ? peelRootParallelHeads(node.nodes[0]!, stitchingInfo)
      : node;
  }

  const children = node.nodes.map(c => peelRootParallelHeads(c, stitchingInfo));
  type Peel = { head: StitchPlanNode; rest: StitchPlanNode | null };
  const peels: Array<Peel | null> = children.map(child => {
    if (child.kind === 'Sequence' && child.nodes.length > 0) {
      const head = child.nodes[0]!;
      if (head.kind !== 'Fetch' || !head.rootField) {
        return null;
      }
      return {
        head,
        rest: child.nodes.length > 1 ? toSeqOrSingle(child.nodes.slice(1)) : null,
      };
    }
    if (child.kind === 'Fetch' && child.rootField) {
      return { head: child, rest: null };
    }
    return null;
  });
  if (peels.some(p => p == null) || !peels.some(p => p!.rest != null)) {
    return { kind: 'Parallel', nodes: children };
  }

  const heads = peels.map(p => p!.head);
  // Root heads never depend on each other via requires.
  const rests = peels.map(p => p!.rest).filter((r): r is StitchPlanNode => r != null);
  const next: StitchPlanNode[] = [{ kind: 'Parallel', nodes: heads }];
  if (rests.length === 1) {
    next.push(rests[0]!);
  } else if (rests.length > 1) {
    next.push({ kind: 'Parallel', nodes: rests });
  }
  return toSeqOrSingle(next);
}

/**
 * Parallel(Sequence(entityFetch, …rest), siblings…) ->
 * Sequence(Parallel(entityFetch, siblings…), rest) when the entity hop does
 * not depend on any sibling. Pulls reviews@users into the same wave as
 * inventory∥reviews@TP (Hive wave 2).
 */
function peelLeadingEntityFetches(
  node: StitchPlanNode,
  stitchingInfo: StitchingInfo,
): StitchPlanNode {
  if (node.kind === 'Island') {
    return node.continue
      ? {
          ...node,
          continue: peelLeadingEntityFetches(node.continue, stitchingInfo),
        }
      : node;
  }
  if (node.kind === 'Condition') {
    return {
      ...node,
      ifClause: node.ifClause ? peelLeadingEntityFetches(node.ifClause, stitchingInfo) : undefined,
      elseClause: node.elseClause
        ? peelLeadingEntityFetches(node.elseClause, stitchingInfo)
        : undefined,
    };
  }
  if (node.kind === 'Sequence') {
    return {
      kind: 'Sequence',
      nodes: node.nodes.map(c => peelLeadingEntityFetches(c, stitchingInfo)),
    };
  }
  if (node.kind !== 'Parallel' || node.nodes.length < 2) {
    return node;
  }
  const children = node.nodes.map(c => peelLeadingEntityFetches(c, stitchingInfo));

  const lifted: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>> = [];
  const rests: StitchPlanNode[] = [];
  const kept: StitchPlanNode[] = [];
  let changed = false;
  for (const child of children) {
    if (child.kind !== 'Sequence' || child.nodes.length < 2) {
      kept.push(child);
      continue;
    }
    const head = child.nodes[0]!;
    if (head.kind !== 'Fetch' || !head.entityTypeName || head.rootField) {
      kept.push(child);
      continue;
    }
    // Never peel @requires-bearing hops - providers must stay ordered.
    if (collectRequiresDeps(stitchingInfo, head).length > 0) {
      kept.push(child);
      continue;
    }
    const siblings = children.filter(c => c !== child);
    const blocked = siblings.some(
      sib =>
        sequenceContainsFetchDependingOn(sib, head, stitchingInfo) ||
        (sib.kind === 'Fetch' ? fetchDependsOn(stitchingInfo, head, sib) : false) ||
        collectFetchesDeep(sib).some(f => fetchDependsOn(stitchingInfo, head, f)),
    );
    if (blocked) {
      kept.push(child);
      continue;
    }
    lifted.push(head);
    rests.push(toSeqOrSingle(child.nodes.slice(1)));
    changed = true;
  }
  if (!changed) {
    return { kind: 'Parallel', nodes: children };
  }
  // Heads + untouched siblings run together; peeled rests continue after
  // (products@users must not race its reviews@users provider).
  // Unwrap Parallel-of-Fetches siblings so reviews@TP sits next to
  // reviews@users for BatchFetch - without flattening arbitrary nests.
  const wave: StitchPlanNode[] = [...lifted];
  for (const k of kept) {
    if (
      k.kind === 'Parallel' &&
      k.nodes.every(n => n.kind === 'Fetch' && Boolean(n.entityTypeName) && !n.rootField)
    ) {
      wave.push(...k.nodes);
    } else {
      wave.push(k);
    }
  }
  return toSeqOrSingle([
    { kind: 'Parallel', nodes: wave },
    ...(rests.length === 1
      ? rests
      : rests.length > 1
        ? [{ kind: 'Parallel' as const, nodes: rests }]
        : []),
  ]);
}

function collectFetchesDeep(
  node: StitchPlanNode,
): Array<Extract<StitchPlanNode, { kind: 'Fetch' }>> {
  const out: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>> = [];
  collectExecutableFetches(node, out);
  return out;
}

/**
 * Sequence(…, Fetch(products@users), Parallel(accounts, products_deep), …)
 * -> Sequence(…, Parallel(products@users, accounts, products_deep), …)
 * when products@users is independent of the Parallel children.
 */
function compressProductsIntoDeepWave(
  node: StitchPlanNode,
  stitchingInfo: StitchingInfo,
): StitchPlanNode {
  if (node.kind === 'Island') {
    return node.continue
      ? {
          ...node,
          continue: compressProductsIntoDeepWave(node.continue, stitchingInfo),
        }
      : node;
  }
  if (node.kind === 'Condition') {
    return {
      ...node,
      ifClause: node.ifClause
        ? compressProductsIntoDeepWave(node.ifClause, stitchingInfo)
        : undefined,
      elseClause: node.elseClause
        ? compressProductsIntoDeepWave(node.elseClause, stitchingInfo)
        : undefined,
    };
  }
  if (node.kind === 'Parallel') {
    return {
      kind: 'Parallel',
      nodes: node.nodes.map(c => compressProductsIntoDeepWave(c, stitchingInfo)),
    };
  }
  if (node.kind !== 'Sequence') {
    return node;
  }
  const nodes = node.nodes.map(c => compressProductsIntoDeepWave(c, stitchingInfo));
  const flat: StitchPlanNode[] = [];
  for (const n of nodes) {
    if (n.kind === 'Sequence') {
      flat.push(...n.nodes);
    } else {
      flat.push(n);
    }
  }
  for (let i = 0; i + 1 < flat.length; i++) {
    const cur = flat[i]!;
    const next = flat[i + 1]!;
    if (cur.kind !== 'Fetch' || !cur.entityTypeName || next.kind !== 'Parallel') {
      continue;
    }
    // Only fold into a deep wave that already has the same entity selection
    // (Hive products@users ∪ products_deep). Avoid lifting unrelated hops
    // into arbitrary Parallels (complex-entity-call).
    const curKey = `${cur.subschema.name}|${cur.entityTypeName}|${selectionSetKey(cur.selectionSet)}`;
    const hasMatch = next.nodes.some(
      n =>
        n.kind === 'Fetch' &&
        !n.rootField &&
        `${n.subschema.name}|${n.entityTypeName}|${selectionSetKey(n.selectionSet)}` === curKey,
    );
    if (!hasMatch) {
      continue;
    }
    const midFetches = collectFetchesDeep(next);
    if (
      midFetches.some(
        m => fetchDependsOn(stitchingInfo, cur, m) || fetchDependsOn(stitchingInfo, m, cur),
      )
    ) {
      continue;
    }
    // Merge same-type same-selection entity Fetches into multi-path (Hive
    // products wave) while keeping other Parallel children.
    const parallelNodes: StitchPlanNode[] = [cur, ...next.nodes];
    const byKey = new Map<string, Array<Extract<StitchPlanNode, { kind: 'Fetch' }>>>();
    const others: StitchPlanNode[] = [];
    for (const n of parallelNodes) {
      if (n.kind === 'Fetch' && n.entityTypeName && !n.rootField) {
        const key = `${n.subschema.name}|${n.entityTypeName}|${selectionSetKey(n.selectionSet)}`;
        let list = byKey.get(key);
        if (!list) {
          list = [];
          byKey.set(key, list);
        }
        list.push(n);
      } else {
        others.push(n);
      }
    }
    const mergedParallel: StitchPlanNode[] = [...others];
    for (const group of byKey.values()) {
      mergedParallel.push(group.length > 1 ? mergeMultiPathFetches(group) : group[0]!);
    }
    flat.splice(i, 2, {
      kind: 'Parallel',
      nodes: mergedParallel,
    });
    return compressProductsIntoDeepWave(toSeqOrSingle(flat), stitchingInfo);
  }
  return toSeqOrSingle(flat);
}

/**
 * Resolve a type from any known subschema (prefer object/interface/union).
 */
function resolveEntityGraphqlType(stitchingInfo: StitchingInfo, typeName: string) {
  for (const sub of allKnownSubschemas(stitchingInfo)) {
    const t = sub.schema.getType(typeName);
    if (t != null) {
      return t;
    }
  }
  return null;
}

/**
 * Possible runtime object type names for an entity hop type. Concrete → self;
 * interface/union → possible types from the first subschema that defines it.
 */
function possibleEntityTypeNames(stitchingInfo: StitchingInfo, typeName: string): Set<string> {
  const t = resolveEntityGraphqlType(stitchingInfo, typeName);
  if (t == null) {
    return new Set();
  }
  if (isObjectType(t)) {
    return new Set([t.name]);
  }
  if (isInterfaceType(t) || isUnionType(t)) {
    for (const sub of allKnownSubschemas(stitchingInfo)) {
      const local = sub.schema.getType(typeName);
      if (
        local &&
        (isInterfaceType(local) || isUnionType(local)) &&
        'getPossibleTypes' in sub.schema
      ) {
        try {
          const possibles = sub.schema.getPossibleTypes(local as any);
          if (possibles?.length) {
            return new Set(possibles.map((p: { name: string }) => p.name));
          }
        } catch {
          // fall through
        }
      }
    }
    // Fallback: collect object types implementing the interface name
    const out = new Set<string>();
    for (const sub of allKnownSubschemas(stitchingInfo)) {
      for (const typ of Object.values(sub.schema.getTypeMap())) {
        if (!isObjectType(typ)) continue;
        if (isInterfaceType(t) && typ.getInterfaces().some(i => i.name === typeName)) {
          out.add(typ.name);
        }
      }
    }
    return out;
  }
  return new Set();
}

/**
 * When entity types nest (Book possibles ⊆ Product possibles) under the same
 * flatten paths, merge into one Fetch on the covering type with inline
 * fragments for more-specific selections (Product||Book → one hop).
 */
function tryCoalesceOverlappingEntityFetches(
  stitchingInfo: StitchingInfo,
  fetches: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>>,
): Extract<StitchPlanNode, { kind: 'Fetch' }> | null {
  if (fetches.length < 2) {
    return null;
  }
  const annotated = fetches.map(f => ({
    f,
    set: possibleEntityTypeNames(stitchingInfo, f.entityTypeName!),
  }));
  if (annotated.some(a => a.set.size === 0)) {
    return null;
  }
  // Covering type: possibles ⊇ every other type's possibles (widest abstract).
  let cover: (typeof annotated)[number] | null = null;
  for (const cand of annotated) {
    const coversAll = annotated.every(o => {
      for (const n of o.set) {
        if (!cand.set.has(n)) {
          return false;
        }
      }
      return true;
    });
    if (!coversAll) {
      continue;
    }
    if (!cover || cand.set.size > cover.set.size) {
      cover = cand;
    }
  }
  if (!cover) {
    return null;
  }
  // Same flatten-path set (same-root Product||Book). Multi-path unions stay
  // on BatchFetch / mergeMultiPathFetches.
  const pathKey = (f: Extract<StitchPlanNode, { kind: 'Fetch' }>) =>
    fetchFlattenPaths(f)
      .map(p => p.join('\0'))
      .sort()
      .join('/');
  const pk0 = pathKey(fetches[0]!);
  if (!pk0 || fetches.some(f => pathKey(f) !== pk0)) {
    return null;
  }
  if (pathsHaveNesting(fetchFlattenPaths(cover.f))) {
    return null;
  }
  // Covering type must own a merge config on this subschema.
  if (!cover.f.subschema.merge?.[cover.f.entityTypeName!]) {
    return null;
  }

  let selectionSet = cover.f.selectionSet;
  for (const o of annotated) {
    if (o === cover) {
      continue;
    }
    const typeName = o.f.entityTypeName!;
    selectionSet = unionSelectionSets(selectionSet, {
      kind: Kind.SELECTION_SET,
      selections: [
        {
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: { kind: Kind.NAME, value: typeName },
          },
          selectionSet: o.f.selectionSet,
        },
      ],
    });
  }

  let runIf = cover.f.runIf;
  for (const o of annotated) {
    if (o === cover) continue;
    runIf = orRunIf(runIf, o.f.runIf);
  }

  return {
    kind: 'Fetch',
    subschema: cover.f.subschema,
    entityTypeName: cover.f.entityTypeName,
    selectionSet,
    flattenPaths: fetchFlattenPaths(cover.f),
    runIf,
    id: cover.f.id,
    dependsOn: cover.f.dependsOn,
    completesIds: cover.f.completesIds,
  };
}

type EntityFetchHop = Extract<StitchPlanNode, { kind: 'Fetch' }> & {
  entityTypeName: string;
};
type FoldableEntityHop = EntityFetchHop | Extract<StitchPlanNode, { kind: 'BatchFetch' }>;

function isEntityFetchHop(n: StitchPlanNode): n is EntityFetchHop {
  return n.kind === 'Fetch' && Boolean(n.entityTypeName) && !n.rootField;
}

function isFoldableEntityHop(n: StitchPlanNode): n is FoldableEntityHop {
  return isEntityFetchHop(n) || n.kind === 'BatchFetch';
}

/** Subschema identity for BatchFetch grouping (name, else object identity). */
function makeSubschemaKeyFn(): (s: Subschema) => string {
  const anonIds = new WeakMap<object, string>();
  let anonSeq = 0;
  return (s: Subschema): string => {
    if (s.name) {
      return `n:${s.name}`;
    }
    let id = anonIds.get(s);
    if (!id) {
      id = `a:${anonSeq++}`;
      anonIds.set(s, id);
    }
    return id;
  };
}

/**
 * Collapse same-subschema entity Fetches into covering Fetch / multi-path /
 * BatchFetch. Shared by Parallel grouping and wave fold.
 */
function collapseSameSubschemaEntityFetches(
  stitchingInfo: StitchingInfo,
  group: EntityFetchHop[],
): StitchPlanNode {
  if (group.length === 0) {
    throw new Error('collapseSameSubschemaEntityFetches: empty group');
  }
  if (group.length === 1) {
    return group[0]!;
  }

  const byEntityType = new Map<string, EntityFetchHop[]>();
  for (const g of group) {
    const tk = g.entityTypeName;
    let list = byEntityType.get(tk);
    if (!list) {
      list = [];
      byEntityType.set(tk, list);
    }
    list.push(g);
  }
  const collapsed: EntityFetchHop[] = [];
  for (const typeGroup of byEntityType.values()) {
    const united = tryUnionEntityFetches(stitchingInfo, typeGroup);
    if (united) {
      collapsed.push(united as EntityFetchHop);
      continue;
    }
    if (typeGroup.length === 1) {
      collapsed.push(typeGroup[0]!);
      continue;
    }
    const sameSel =
      typeGroup.every(
        g => selectionSetKey(g.selectionSet) === selectionSetKey(typeGroup[0]!.selectionSet),
      ) && !pathsHaveNesting(typeGroup.flatMap(fetchFlattenPaths));
    if (sameSel) {
      collapsed.push(mergeMultiPathFetches(typeGroup) as EntityFetchHop);
    } else {
      collapsed.push(...typeGroup);
    }
  }

  if (collapsed.length === 1) {
    return collapsed[0]!;
  }

  const covering = tryCoalesceOverlappingEntityFetches(stitchingInfo, collapsed);
  if (covering) {
    return covering;
  }

  return {
    kind: 'BatchFetch',
    subschema: collapsed[0]!.subschema,
    aliases: collapsed.map((g, i) => ({
      alias: `_e${i}`,
      entityTypeName: g.entityTypeName,
      selectionSet: g.selectionSet,
      flattenPaths: fetchFlattenPaths(g),
      runIf: g.runIf,
    })),
    runIf: collapsed.reduce(
      (acc: ReturnType<typeof orRunIf>, g) => orRunIf(acc, g.runIf),
      collapsed[0]!.runIf as ReturnType<typeof orRunIf>,
    ),
  };
}

function expandFoldableToEntityFetches(hop: FoldableEntityHop): EntityFetchHop[] {
  if (hop.kind === 'Fetch') {
    return [hop];
  }
  return hop.aliases.map(a => ({
    kind: 'Fetch' as const,
    subschema: hop.subschema,
    entityTypeName: a.entityTypeName,
    selectionSet: a.selectionSet,
    flattenPaths: a.flattenPaths,
    runIf: a.runIf,
  }));
}

function hopCompletesIdList(hop: FoldableEntityHop): string[] {
  if (hop.completesIds?.length) {
    return [...hop.completesIds];
  }
  return hop.id ? [hop.id] : [];
}

/**
 * Attach schedule metadata from a fold group onto the collapsed hop so
 * dependents still see every original completesId.
 */
function withFoldScheduleMeta(
  collapsed: StitchPlanNode,
  group: FoldableEntityHop[],
): StitchPlanNode {
  const completesIds = [...new Set(group.flatMap(hopCompletesIdList))];
  const dependsOn = new Set<string>();
  for (const h of group) {
    for (const d of h.dependsOn ?? []) {
      dependsOn.add(d);
    }
  }
  for (const id of completesIds) {
    dependsOn.delete(id);
  }
  const depList = [...dependsOn];
  if (collapsed.kind === 'Fetch') {
    return {
      ...collapsed,
      id: completesIds[0] ?? collapsed.id,
      completesIds: completesIds.length ? completesIds : collapsed.completesIds,
      dependsOn: depList.length ? depList : collapsed.dependsOn,
    };
  }
  if (collapsed.kind === 'BatchFetch') {
    return {
      ...collapsed,
      id: completesIds[0] ?? collapsed.id,
      completesIds: completesIds.length ? completesIds : collapsed.completesIds,
      dependsOn: depList.length ? depList : collapsed.dependsOn,
    };
  }
  return collapsed;
}

/**
 * Inside each Parallel, collapse same-subschema entity Fetches:
 * - same type -> multi-path / selection union when safe
 * - overlapping abstract/concrete (Product||Book) -> covering Fetch when
 *   possibles nest; else BatchFetch (including same root)
 * - disjoint concretes (Book||Magazine) -> BatchFetch
 */
function groupParallelBatchFetches(
  node: StitchPlanNode,
  stitchingInfo: StitchingInfo,
): StitchPlanNode {
  if (node.kind === 'Island') {
    return node.continue
      ? {
          ...node,
          continue: groupParallelBatchFetches(node.continue, stitchingInfo),
        }
      : node;
  }
  if (node.kind === 'Condition') {
    return {
      ...node,
      ifClause: node.ifClause ? groupParallelBatchFetches(node.ifClause, stitchingInfo) : undefined,
      elseClause: node.elseClause
        ? groupParallelBatchFetches(node.elseClause, stitchingInfo)
        : undefined,
    };
  }
  if (node.kind === 'Sequence') {
    const mapped = node.nodes.map(c => groupParallelBatchFetches(c, stitchingInfo));
    // Consecutive entity Fetches in a Sequence are parallel-ready after the
    // shared prefix - BatchFetch them like a Parallel group.
    const out: StitchPlanNode[] = [];
    let i = 0;
    while (i < mapped.length) {
      if (!isEntityFetchHop(mapped[i]!)) {
        out.push(mapped[i]!);
        i++;
        continue;
      }
      const run: EntityFetchHop[] = [];
      while (i < mapped.length) {
        const hop = mapped[i]!;
        if (!isEntityFetchHop(hop)) {
          break;
        }
        run.push(hop);
        i++;
      }
      if (run.length < 2) {
        out.push(...run);
      } else {
        out.push(groupParallelBatchFetches({ kind: 'Parallel', nodes: run }, stitchingInfo));
      }
    }
    return out.length === 1 ? out[0]! : { kind: 'Sequence', nodes: out };
  }
  if (node.kind !== 'Parallel') {
    return node;
  }
  const children = node.nodes.map(c => groupParallelBatchFetches(c, stitchingInfo));
  const entityFetches = children.filter(isEntityFetchHop);
  if (entityFetches.length < 2) {
    return { kind: 'Parallel', nodes: children };
  }

  const subKey = makeSubschemaKeyFn();
  const bySub = new Map<string, EntityFetchHop[]>();
  for (const f of entityFetches) {
    const key = subKey(f.subschema);
    let list = bySub.get(key);
    if (!list) {
      list = [];
      bySub.set(key, list);
    }
    list.push(f);
  }

  const consumed = new Set<StitchPlanNode>();
  const next: StitchPlanNode[] = [];

  for (const child of children) {
    if (consumed.has(child)) {
      continue;
    }
    if (!isEntityFetchHop(child)) {
      next.push(child);
      continue;
    }
    const group = bySub.get(subKey(child.subschema));
    if (!group || group.length < 2) {
      next.push(child);
      continue;
    }
    if (group[0] !== child) {
      // Emitted when we visited group[0].
      continue;
    }
    for (const g of group) {
      consumed.add(g);
    }
    next.push(collapseSameSubschemaEntityFetches(stitchingInfo, group));
  }
  return next.length === 1 ? next[0]! : { kind: 'Parallel', nodes: next };
}

/** True when every entity type in the group shares one merge field + arg. */
function groupCanTrueBatchHttp(group: FoldableEntityHop[]): boolean {
  const expanded = group.flatMap(expandFoldableToEntityFetches);
  if (!expanded.length) {
    return false;
  }
  const entries = expanded.map(f => getBatchedMergeEntry(f.subschema, f.entityTypeName));
  const first = entries[0];
  if (first == null) {
    return false;
  }
  const argName = inferMergeArgName(first.argsFromKeys);
  if (argName == null) {
    return false;
  }
  return entries.every(
    e =>
      e != null && e.fieldName === first.fieldName && inferMergeArgName(e.argsFromKeys) === argName,
  );
}

function earliestHopWave(hop: { dependsOn?: string[] }, waveById: Map<string, number>): number {
  const deps = hop.dependsOn ?? [];
  if (!deps.length) {
    return 0;
  }
  let w = 0;
  for (const d of deps) {
    w = Math.max(w, (waveById.get(d) ?? 0) + 1);
  }
  return w;
}

function buildCompletesWaveMap(root: StitchPlanNode): Map<string, number> {
  const hops: Array<
    | Extract<StitchPlanNode, { kind: 'Fetch' }>
    | Extract<StitchPlanNode, { kind: 'BatchFetch' }>
    | Extract<StitchPlanNode, { kind: 'Island' }>
  > = [];
  collectExecutableHops(root, hops, {});
  const byId = new Map<string, (typeof hops)[number]>();
  for (const h of hops) {
    for (const id of h.completesIds?.length ? h.completesIds : h.id ? [h.id] : []) {
      byId.set(id, h);
    }
  }
  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  const waveOf = (id: string): number => {
    if (memo.has(id)) {
      return memo.get(id)!;
    }
    if (visiting.has(id)) {
      return 0;
    }
    visiting.add(id);
    const h = byId.get(id);
    let w = 0;
    if (h) {
      for (const d of h.dependsOn ?? []) {
        w = Math.max(w, waveOf(d) + 1);
      }
    }
    visiting.delete(id);
    memo.set(id, w);
    return w;
  };
  for (const id of byId.keys()) {
    waveOf(id);
  }
  return memo;
}

function countFoldableEntityHops(root: StitchPlanNode): number {
  const hops: Array<
    | Extract<StitchPlanNode, { kind: 'Fetch' }>
    | Extract<StitchPlanNode, { kind: 'BatchFetch' }>
    | Extract<StitchPlanNode, { kind: 'Island' }>
  > = [];
  collectExecutableHops(root, hops, {});
  return hops.filter(isFoldableEntityHop).length;
}

/**
 * Fold foldable entity hops using `groupKey`. When `requireTrueBatchHttp` is
 * set, skip groups that cannot share one merge-field HTTP (avoids waiting on
 * a unioned dependsOn only to fall back to parallel Fetches).
 */
function foldEntityHopsByKey(
  root: StitchPlanNode,
  stitchingInfo: StitchingInfo,
  groupKey: (hop: FoldableEntityHop) => string,
  opts: { requireTrueBatchHttp?: boolean } = {},
): StitchPlanNode {
  const allHops: Array<
    | Extract<StitchPlanNode, { kind: 'Fetch' }>
    | Extract<StitchPlanNode, { kind: 'BatchFetch' }>
    | Extract<StitchPlanNode, { kind: 'Island' }>
  > = [];
  collectExecutableHops(root, allHops, {});
  const foldable = allHops.filter(isFoldableEntityHop);
  if (foldable.length < 2) {
    return root;
  }

  const groups = new Map<string, FoldableEntityHop[]>();
  for (const hop of foldable) {
    const key = groupKey(hop);
    let list = groups.get(key);
    if (!list) {
      list = [];
      groups.set(key, list);
    }
    list.push(hop);
  }

  const replacement = new Map<StitchPlanNode, StitchPlanNode>();
  const skip = new Set<StitchPlanNode>();
  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }
    if (opts.requireTrueBatchHttp && !groupCanTrueBatchHttp(group)) {
      continue;
    }
    const expanded = group.flatMap(expandFoldableToEntityFetches);
    const collapsed = withFoldScheduleMeta(
      collapseSameSubschemaEntityFetches(stitchingInfo, expanded),
      group,
    );
    if (collapsed === group[0] && group.length === 1) {
      continue;
    }
    replacement.set(group[0]!, collapsed);
    for (let i = 1; i < group.length; i++) {
      skip.add(group[i]!);
    }
  }
  if (!replacement.size) {
    return root;
  }

  const rewrite = (node: StitchPlanNode): StitchPlanNode | null => {
    if (skip.has(node)) {
      return null;
    }
    const rep = replacement.get(node);
    if (rep) {
      return rep;
    }
    if (node.kind === 'Island') {
      const cont = node.continue ? rewrite(node.continue) : undefined;
      return cont === node.continue ? node : { ...node, continue: cont ?? undefined };
    }
    if (node.kind === 'Condition') {
      const ifClause = node.ifClause ? rewrite(node.ifClause) : undefined;
      const elseClause = node.elseClause ? rewrite(node.elseClause) : undefined;
      return {
        ...node,
        ifClause: ifClause ?? undefined,
        elseClause: elseClause ?? undefined,
      };
    }
    if (node.kind === 'Sequence' || node.kind === 'Parallel') {
      const nodes: StitchPlanNode[] = [];
      let changed = false;
      for (const c of node.nodes) {
        const next = rewrite(c);
        if (next == null) {
          changed = true;
          continue;
        }
        if (next !== c) {
          changed = true;
        }
        nodes.push(next);
      }
      if (!changed) {
        return node;
      }
      if (nodes.length === 0) {
        return null;
      }
      if (nodes.length === 1) {
        return nodes[0]!;
      }
      return { kind: node.kind, nodes };
    }
    return node;
  };

  return rewrite(root) ?? root;
}

/**
 * After dependsOn + entity-reuse annotation:
 * 1. Always fold hops that share the **exact same dependsOn** + subgraph
 *    (safe ready-set; no continuous-dispatch delay).
 * 2. When many entity hops remain (planning-large), also fold by earliest
 *    ready **wave** + subgraph. Gated so small plans like federation-example
 *    keep exact-deps-only scheduling. Wave groups must be able to share one
 *    merge-field HTTP.
 */
function foldSameWaveSubgraphFetches(
  root: StitchPlanNode,
  stitchingInfo: StitchingInfo,
): StitchPlanNode {
  const subKey = makeSubschemaKeyFn();
  const depsKey = (hop: FoldableEntityHop): string => [...(hop.dependsOn ?? [])].sort().join('\0');

  // Pass 1: exact ready-set (never delays independent chains).
  const next = foldEntityHopsByKey(
    root,
    stitchingInfo,
    hop => `${depsKey(hop)}::${subKey(hop.subschema)}`,
  );

  // Pass 2: aggressive wave fold only on large plans.
  if (countFoldableEntityHops(next) < AGGRESSIVE_WAVE_FOLD_MIN_ENTITY_HOPS) {
    return next;
  }
  const waveById = buildCompletesWaveMap(next);
  return foldEntityHopsByKey(
    next,
    stitchingInfo,
    hop => `${earliestHopWave(hop, waveById)}::${subKey(hop.subschema)}`,
    { requireTrueBatchHttp: true },
  );
}

/**
 * Field response-key → nested selection (null = leaf). Inline fragments are
 * flattened into the map (union). Fragment spreads → null (unprovable).
 */
function collectFieldTrees(ss: SelectionSetNode): Map<string, SelectionSetNode | null> | null {
  const m = new Map<string, SelectionSetNode | null>();
  for (const sel of ss.selections) {
    if (sel.kind === Kind.FIELD) {
      if (sel.name.value === '__typename') {
        continue;
      }
      const key = sel.alias?.value ?? sel.name.value;
      const nested = sel.selectionSet ?? null;
      const prior = m.get(key);
      if (nested != null && prior != null) {
        m.set(key, unionSelectionSets(prior, nested));
      } else if (nested != null && (prior === undefined || prior === null)) {
        m.set(key, nested);
      } else if (!m.has(key)) {
        m.set(key, nested);
      }
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      const inner = collectFieldTrees(sel.selectionSet);
      if (!inner) {
        return null;
      }
      for (const [k, v] of inner) {
        const prior = m.get(k);
        if (v != null && prior != null) {
          m.set(k, unionSelectionSets(prior, v));
        } else if (v != null && (prior === undefined || prior === null)) {
          m.set(k, v);
        } else if (!m.has(k)) {
          m.set(k, v);
        }
      }
    } else {
      return null;
    }
  }
  return m;
}

/**
 * True when `source` selection covers every field (incl. nested trees) that
 * `needed` asks for. Inline fragments on `needed` are treated as always-needed
 * (plan-time; no runtime typename).
 */
function selectionCovers(source: SelectionSetNode, needed: SelectionSetNode): boolean {
  const have = collectFieldTrees(source);
  if (!have) {
    return false;
  }
  for (const sel of needed.selections) {
    if (sel.kind === Kind.FIELD) {
      if (sel.name.value === '__typename') {
        continue;
      }
      const key = sel.alias?.value ?? sel.name.value;
      if (!have.has(key)) {
        return false;
      }
      if (sel.selectionSet) {
        const srcNested = have.get(key);
        if (!srcNested) {
          return false;
        }
        if (!selectionCovers(srcNested, sel.selectionSet)) {
          return false;
        }
      }
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      if (!selectionCovers(source, sel.selectionSet)) {
        return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

/**
 * Annotate entity hops that can copy fields from an earlier hop they already
 * wait on (same entity type, covering selection — nested trees included).
 * Always on for queries. Adds a same-subgraph wait when a covering predecessor
 * would otherwise race the copy.
 */
function annotateEntityReuse(root: StitchPlanNode): StitchPlanNode {
  const hops: Array<
    | Extract<StitchPlanNode, { kind: 'Fetch' }>
    | Extract<StitchPlanNode, { kind: 'BatchFetch' }>
    | Extract<StitchPlanNode, { kind: 'Island' }>
  > = [];
  collectExecutableHops(root, hops, {});
  const byId = new Map<string, (typeof hops)[number]>();
  for (const h of hops) {
    for (const id of h.completesIds?.length ? h.completesIds : h.id ? [h.id] : []) {
      byId.set(id, h);
    }
  }

  const coveringSources = (hop: Extract<StitchPlanNode, { kind: 'Fetch' }>): string[] => {
    if (!hop.entityTypeName || hop.rootField) {
      return [];
    }
    const needed = hop.selectionSet;
    const seen = new Set<string>();
    const out: string[] = [];
    const stack = [...(hop.dependsOn ?? [])];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const src = byId.get(id);
      if (!src) continue;
      for (const d of src.dependsOn ?? []) {
        stack.push(d);
      }
      if (src.kind === 'Fetch' && src.entityTypeName === hop.entityTypeName) {
        if (selectionCovers(src.selectionSet, needed)) {
          out.push(src.id ?? id);
        }
      } else if (src.kind === 'Fetch' && src.rootField) {
        // Root may embed entity fields under flatten path - leaf cover only
        // when root selectionSet matches entity type fields directly.
        if (src.selectionSet && selectionCovers(src.selectionSet, needed)) {
          out.push(src.id ?? id);
        }
      } else if (src.kind === 'BatchFetch') {
        for (const a of src.aliases) {
          if (a.entityTypeName === hop.entityTypeName && selectionCovers(a.selectionSet, needed)) {
            out.push(src.id ?? id);
            break;
          }
        }
      }
    }
    return out;
  };

  const rewrite = (node: StitchPlanNode): StitchPlanNode => {
    if (node.kind === 'Fetch' && node.entityTypeName && !node.rootField) {
      const reuseFrom = coveringSources(node);
      if (!reuseFrom.length) {
        return node;
      }
      const deps = new Set(node.dependsOn ?? []);
      for (const id of reuseFrom) {
        deps.add(id);
      }
      return {
        ...node,
        reuseFrom,
        dependsOn: [...deps],
      };
    }
    if (node.kind === 'BatchFetch') {
      return node;
    }
    if (node.kind === 'Island') {
      return {
        ...node,
        continue: node.continue ? rewrite(node.continue) : undefined,
      };
    }
    if (node.kind === 'Condition') {
      return {
        ...node,
        ifClause: node.ifClause ? rewrite(node.ifClause) : undefined,
        elseClause: node.elseClause ? rewrite(node.elseClause) : undefined,
      };
    }
    if (node.kind === 'Sequence' || node.kind === 'Parallel') {
      return { kind: node.kind, nodes: node.nodes.map(rewrite) };
    }
    return node;
  };
  return rewrite(root);
}

/**
 * Attach id/dependsOn for dataflow execute from `fetchDependsOn` (path /
 * @requires / keys). Final plans flatten Sequence/Parallel afterward.
 *
 * `serializeSequences`: mutations - later Sequence siblings wait on every hop
 * completed by earlier siblings (document order / shared subgraph state).
 * Islands always gate their `continue` subgraph.
 */
function annotateFetchDeps(
  root: StitchPlanNode,
  stitchingInfo: StitchingInfo,
  opts: { serializeSequences?: boolean } = {},
): StitchPlanNode {
  const fetches: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>> = [];
  collectExecutableFetches(root, fetches);
  if (!fetches.length) {
    // Still annotate Islands when the plan is Island-only.
    return assignDepsOnly(root, new Map(), {
      serializeSequences: opts.serializeSequences === true,
    });
  }
  const ids = fetches.map((_, i) => `f${i}`);
  const depIds: string[][] = fetches.map(() => []);
  for (let i = 0; i < fetches.length; i++) {
    for (let j = 0; j < fetches.length; j++) {
      if (i === j) {
        continue;
      }
      if (fetchDependsOn(stitchingInfo, fetches[i]!, fetches[j]!)) {
        depIds[i]!.push(ids[j]!);
      }
    }
  }

  const fetchDepMap = new Map<number, { id: string; dependsOn: string[] }>();
  for (let i = 0; i < fetches.length; i++) {
    fetchDepMap.set(i, { id: ids[i]!, dependsOn: [...new Set(depIds[i]!)] });
  }
  return assignDepsOnly(root, fetchDepMap, {
    serializeSequences: opts.serializeSequences === true,
  });
}

function assignDepsOnly(
  root: StitchPlanNode,
  fetchDepMap: Map<number, { id: string; dependsOn: string[] }>,
  opts: { serializeSequences: boolean },
): StitchPlanNode {
  // First pass: materialize Fetch nodes with ids so Islands can depend on
  // path-producing hops (nested Island under books[] waits for books Fetch).
  type AnnotatedFetch = Extract<StitchPlanNode, { kind: 'Fetch' }> & {
    id: string;
  };
  const annotatedFetches: AnnotatedFetch[] = [];
  let counter = 0;
  let islandSeq = 0;

  const pathProducersFor = (paths: PathSegment[][] | undefined): string[] => {
    if (!paths?.length) {
      return [];
    }
    const ids: string[] = [];
    for (const fetch of annotatedFetches) {
      const fps = fetchFlattenPaths(fetch);
      for (const islandPath of paths) {
        for (const fp of fps) {
          // Fetch produces the Island parent when its path is a prefix of
          // (or equal to) the Island flatten path.
          if (pathIsPrefix(fp, islandPath) || pathsEqual(fp, islandPath)) {
            ids.push(fetch.id);
          }
        }
        // Root Fetch with response key matching Island path head.
        if (fetch.rootField) {
          const rk = fetch.rootField.alias?.value ?? fetch.rootField.name.value;
          if (islandPath[0] === rk) {
            ids.push(fetch.id);
          }
        }
      }
    }
    return [...new Set(ids)];
  };

  const assign = (node: StitchPlanNode, islandBarrier: string[]): StitchPlanNode => {
    if (node.kind === 'Fetch') {
      const meta = fetchDepMap.get(counter) ?? {
        id: `f${counter}`,
        dependsOn: [] as string[],
      };
      counter++;
      const annotated = {
        ...node,
        id: meta.id,
        dependsOn: [...new Set([...meta.dependsOn, ...islandBarrier])],
        completesIds: [meta.id],
      };
      annotatedFetches.push(annotated as AnnotatedFetch);
      return annotated;
    }
    if (node.kind === 'BatchFetch') {
      const completesIds: string[] = [];
      const dependsOn = new Set<string>(islandBarrier);
      for (const _alias of node.aliases) {
        const meta = fetchDepMap.get(counter) ?? {
          id: `f${counter}`,
          dependsOn: [] as string[],
        };
        completesIds.push(meta.id);
        for (const d of meta.dependsOn) {
          dependsOn.add(d);
        }
        counter++;
      }
      for (const id of completesIds) {
        dependsOn.delete(id);
      }
      return {
        ...node,
        id: completesIds[0],
        completesIds,
        dependsOn: [...dependsOn],
      };
    }
    if (node.kind === 'Island') {
      const islandId = `is${islandSeq++}`;
      const islandPaths = node.flattenPaths;
      const producers = pathProducersFor(islandPaths);
      return {
        ...node,
        id: islandId,
        dependsOn: [...new Set([...islandBarrier, ...producers])],
        completesIds: [islandId],
        continue: node.continue ? assign(node.continue, [...islandBarrier, islandId]) : undefined,
      };
    }
    if (node.kind === 'Condition') {
      return {
        ...node,
        ifClause: node.ifClause ? assign(node.ifClause, islandBarrier) : undefined,
        elseClause: node.elseClause ? assign(node.elseClause, islandBarrier) : undefined,
      };
    }
    if (node.kind === 'Parallel') {
      return {
        kind: 'Parallel',
        nodes: node.nodes.map(c => assign(c, islandBarrier)),
      };
    }
    if (node.kind === 'Sequence') {
      if (!opts.serializeSequences) {
        return {
          kind: 'Sequence',
          nodes: node.nodes.map(c => assign(c, islandBarrier)),
        };
      }
      // Mutation document order: each sibling waits on prior siblings' hops.
      const next: StitchPlanNode[] = [];
      let barrier = islandBarrier;
      for (const child of node.nodes) {
        const assigned = assign(child, barrier);
        next.push(assigned);
        const completed: string[] = [];
        collectAnnotatedIds(assigned, completed);
        if (completed.length) {
          barrier = [...barrier, ...completed];
        }
      }
      return { kind: 'Sequence', nodes: next };
    }
    return node;
  };
  return assign(root, []);
}

function collectAnnotatedIds(node: StitchPlanNode, out: string[]): void {
  if (node.kind === 'Fetch' || node.kind === 'BatchFetch' || node.kind === 'Island') {
    if (node.completesIds?.length) {
      out.push(...node.completesIds);
    } else if (node.id) {
      out.push(node.id);
    }
    if (node.kind === 'Island' && node.continue) {
      collectAnnotatedIds(node.continue, out);
    }
    return;
  }
  if (node.kind === 'Condition') {
    if (node.ifClause) {
      collectAnnotatedIds(node.ifClause, out);
    }
    if (node.elseClause) {
      collectAnnotatedIds(node.elseClause, out);
    }
    return;
  }
  if (node.kind === 'Sequence' || node.kind === 'Parallel') {
    for (const child of node.nodes) {
      collectAnnotatedIds(child, out);
    }
  }
}
