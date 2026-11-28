import {
  getNamedType,
  isAbstractType,
  isInterfaceType,
  isObjectType,
  Kind,
  parse,
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLSchema,
  type OperationDefinitionNode,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import type {
  MergedFieldConfig,
  MergedFieldContextArgument,
  StitchingInfo,
  Subschema,
} from '@graphql-tools/delegate';
import type { PathSegment, StitchContextArgument, StitchContextPathSegment } from './types.js';

/**
 * Merge field config for `fieldName` on `typeName` owned by `subschema`,
 * including entry-split clones that share the same transformed schema.
 */
export function findMergeFieldConfig(
  stitchingInfo: StitchingInfo,
  subschema: Subschema,
  typeName: string,
  fieldName: string,
): MergedFieldConfig | undefined {
  const direct = subschema.merge?.[typeName]?.fields?.[fieldName];
  if (direct?.contextArguments?.length || direct?.selectionSet || direct?.computed) {
    return direct;
  }
  // Entry-split clones (requires-with-argument-conflict) share the schema.
  for (const [, other] of stitchingInfo.subschemaMap) {
    if (other === subschema) {
      continue;
    }
    if (other.transformedSchema !== subschema.transformedSchema) {
      continue;
    }
    const fields = other.merge?.[typeName]?.fields?.[fieldName];
    if (fields?.contextArguments?.length || fields?.selectionSet || fields?.computed) {
      return fields;
    }
  }
  return direct;
}

/** True when any selected field on this entity hop needs `@fromContext`. */
export function selectionHasContextArguments(
  stitchingInfo: StitchingInfo,
  subschema: Subschema,
  typeName: string,
  selectionSet: SelectionSetNode,
): boolean {
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.INLINE_FRAGMENT) {
      const on = sel.typeCondition?.name.value ?? typeName;
      if (selectionHasContextArguments(stitchingInfo, subschema, on, sel.selectionSet)) {
        return true;
      }
      continue;
    }
    if (sel.kind !== Kind.FIELD || sel.name.value === '__typename') {
      continue;
    }
    const cfg = findMergeFieldConfig(stitchingInfo, subschema, typeName, sel.name.value);
    if (cfg?.contextArguments?.length) {
      return true;
    }
  }
  return false;
}

/**
 * Parse a Federation context selection string (` { currency }` or
 * `... on Foo { prop }`) into rewrite path segments after Parent depth.
 */
export function parseContextSelectionPath(selection: string): StitchContextPathSegment[] {
  const trimmed = selection.trim();
  const wrapped = trimmed.startsWith('{') ? trimmed : `{ ${trimmed} }`;
  let document;
  try {
    document = parse(wrapped, { noLocation: true });
  } catch {
    return [];
  }
  const op = document.definitions[0];
  if (op?.kind !== Kind.OPERATION_DEFINITION) {
    return [];
  }
  return selectionSetToPath(op.selectionSet.selections);
}

/**
 * Flatten a context selection into rewrite segments. Sibling inline fragments
 * with type conditions are kept as `Alternatives` (not one sequential path),
 * so `... on A { x } ... on B { y }` matches whichever provider type applies.
 */
function selectionSetToPath(selections: readonly SelectionNode[]): StitchContextPathSegment[] {
  const typedFrags: Array<{ typeName: string; selections: readonly SelectionNode[] }> = [];
  const rest: SelectionNode[] = [];
  for (const sel of selections) {
    if (sel.kind === Kind.INLINE_FRAGMENT && sel.typeCondition) {
      typedFrags.push({
        typeName: sel.typeCondition.name.value,
        selections: sel.selectionSet.selections,
      });
      continue;
    }
    rest.push(sel);
  }

  const path: StitchContextPathSegment[] = [];
  for (const sel of rest) {
    if (sel.kind === Kind.INLINE_FRAGMENT) {
      // Untyped fragment: fold children into this path.
      path.push(...selectionSetToPath(sel.selectionSet.selections));
      continue;
    }
    if (sel.kind === Kind.FIELD) {
      path.push({ Key: sel.name.value });
      if (sel.selectionSet) {
        path.push(...selectionSetToPath(sel.selectionSet.selections));
      }
    }
  }

  if (!typedFrags.length) {
    return path;
  }

  if (typedFrags.length === 1) {
    const frag = typedFrags[0]!;
    path.push({ TypenameEquals: [frag.typeName] });
    path.push(...selectionSetToPath(frag.selections));
    return path;
  }

  // Disjoint type-conditioned branches are alternatives, not a sequence.
  path.push({
    Alternatives: typedFrags.map(frag => [
      { TypenameEquals: [frag.typeName] },
      ...selectionSetToPath(frag.selections),
    ]),
  });
  return path;
}

/**
 * Resolve object type names along a flatten path from the operation root
 * (list indexes are ignored; only field name segments matter).
 *
 * Flatten paths use response keys (aliases). When `operation` is provided,
 * each key is resolved to the schema field via the operation selection tree.
 */
export function typeNamesAlongFlattenPath(
  schema: GraphQLSchema,
  flattenPath: PathSegment[],
  options?: {
    rootType?: GraphQLObjectType | null;
    operation?: OperationDefinitionNode;
    fragments?: Record<string, FragmentDefinitionNode>;
  },
): string[] {
  const rootType = options?.rootType ?? schema.getQueryType();
  if (!rootType) {
    return [];
  }
  const types: string[] = [rootType.name];
  let current: GraphQLNamedType = rootType;
  let selections: readonly SelectionNode[] | undefined =
    options?.operation?.selectionSet.selections;
  const fragments = options?.fragments;

  for (const segment of flattenPath) {
    if (typeof segment === 'number') {
      continue;
    }
    if (!current || !(isObjectType(current) || isInterfaceType(current))) {
      break;
    }
    let fieldName = segment;
    let nextSelections: readonly SelectionNode[] | undefined;
    if (selections) {
      const resolved = resolveSelectionForResponseKey(
        schema,
        current,
        selections,
        segment,
        fragments,
      );
      if (!resolved) {
        break;
      }
      fieldName = resolved.fieldName;
      nextSelections = resolved.childSelections;
      if (resolved.concreteType) {
        // Keep the declared field type for provider matching; record the
        // narrowed concrete separately only for continuing the walk.
        // Provider check accepts implementers of interface providers.
        current = resolved.concreteType;
        types[types.length - 1] = current.name;
        if (!(isObjectType(current) || isInterfaceType(current))) {
          break;
        }
      }
    }
    if (!(isObjectType(current) || isInterfaceType(current))) {
      break;
    }
    const field = current.getFields()[fieldName];
    if (!field) {
      break;
    }
    const named = getNamedType(field.type as GraphQLOutputType);
    types.push(named.name);
    current = named;
    selections = nextSelections;
  }
  return types;
}

function resolveSelectionForResponseKey(
  schema: GraphQLSchema,
  parentType: GraphQLNamedType,
  selections: readonly SelectionNode[],
  responseKey: string,
  fragments?: Record<string, FragmentDefinitionNode>,
): {
  fieldName: string;
  childSelections?: readonly SelectionNode[];
  concreteType?: GraphQLNamedType;
} | null {
  for (const sel of selections) {
    if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const frag = fragments?.[sel.name.value];
      if (!frag) {
        continue;
      }
      let fragType = parentType;
      const named = schema.getType(frag.typeCondition.name.value);
      if (named) {
        fragType = named;
      }
      const found = resolveSelectionForResponseKey(
        schema,
        fragType,
        frag.selectionSet.selections,
        responseKey,
        fragments,
      );
      if (found) {
        return {
          ...found,
          concreteType: found.concreteType ?? (named && named !== parentType ? named : undefined),
        };
      }
      continue;
    }
    if (sel.kind === Kind.INLINE_FRAGMENT) {
      let fragType = parentType;
      if (sel.typeCondition) {
        const named = schema.getType(sel.typeCondition.name.value);
        if (named) {
          fragType = named;
        }
      }
      const found = resolveSelectionForResponseKey(
        schema,
        fragType,
        sel.selectionSet.selections,
        responseKey,
        fragments,
      );
      if (found) {
        return {
          ...found,
          concreteType: found.concreteType ?? (sel.typeCondition ? fragType : undefined),
        };
      }
      continue;
    }
    if (sel.kind !== Kind.FIELD) {
      continue;
    }
    const key = sel.alias?.value ?? sel.name.value;
    if (key !== responseKey) {
      continue;
    }
    return {
      fieldName: sel.name.value,
      childSelections: sel.selectionSet?.selections,
    };
  }
  return null;
}

/** True when `typeName` is a listed provider or implements a provider interface. */
function typeMatchesContextProvider(
  schema: GraphQLSchema,
  typeName: string,
  providers: readonly string[],
): boolean {
  if (providers.includes(typeName)) {
    return true;
  }
  const runtime = schema.getType(typeName);
  if (!runtime || !isObjectType(runtime)) {
    return false;
  }
  for (const provider of providers) {
    const providerType = schema.getType(provider);
    if (providerType && isAbstractType(providerType) && schema.isSubType(providerType, runtime)) {
      return true;
    }
  }
  return false;
}

/** `@context` providers for a context name (from `stitchSchemas({ contextProviders })`). */
export function getContextProviders(
  _schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  contextName: string,
): string[] {
  return stitchingInfo.contextProviders?.[contextName] ?? [];
}

/**
 * Build context rewrites for every `@fromContext` field in an entity selection
 * at `flattenPath`. Returns undefined when the hop has no contextual args.
 */
export function buildContextArgumentsForFetch(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  subschema: Subschema,
  entityTypeName: string,
  selectionSet: SelectionSetNode,
  flattenPath: PathSegment[],
  variableCounter: { n: number },
  options?: {
    rootType?: GraphQLObjectType | null;
    operation?: OperationDefinitionNode;
    fragments?: Record<string, FragmentDefinitionNode>;
    /** Client variable names that must not collide with generated `__context_N`. */
    reservedVariableNames?: ReadonlySet<string>;
  },
): StitchContextArgument[] | undefined {
  const typeNames = typeNamesAlongFlattenPath(schema, flattenPath, options);
  // typeNames includes root; last entry is the entity type at flattenPath.
  const out: StitchContextArgument[] = [];
  collectContextArgsFromSelection(
    schema,
    stitchingInfo,
    subschema,
    entityTypeName,
    selectionSet,
    typeNames,
    variableCounter,
    out,
    options?.reservedVariableNames,
  );
  return out.length ? out : undefined;
}

function collectContextArgsFromSelection(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  subschema: Subschema,
  typeName: string,
  selectionSet: SelectionSetNode,
  typeNamesAlongPath: string[],
  variableCounter: { n: number },
  out: StitchContextArgument[],
  reservedVariableNames?: ReadonlySet<string>,
): void {
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.INLINE_FRAGMENT) {
      const on = sel.typeCondition?.name.value ?? typeName;
      collectContextArgsFromSelection(
        schema,
        stitchingInfo,
        subschema,
        on,
        sel.selectionSet,
        typeNamesAlongPath,
        variableCounter,
        out,
        reservedVariableNames,
      );
      continue;
    }
    if (sel.kind !== Kind.FIELD || sel.name.value === '__typename') {
      continue;
    }
    const cfg = findMergeFieldConfig(stitchingInfo, subschema, typeName, sel.name.value);
    if (!cfg?.contextArguments?.length) {
      continue;
    }
    for (const ca of cfg.contextArguments) {
      const rewrite = resolveContextRewrite(
        schema,
        stitchingInfo,
        typeNamesAlongPath,
        ca,
        variableCounter,
        reservedVariableNames,
      );
      if (rewrite) {
        out.push({ ...rewrite, fieldName: sel.name.value });
      }
    }
  }
}

function allocateContextVariableName(
  variableCounter: { n: number },
  reservedVariableNames?: ReadonlySet<string>,
): string {
  while (true) {
    const variableName = `__context_${variableCounter.n++}`;
    if (!reservedVariableNames?.has(variableName)) {
      return variableName;
    }
  }
}

function resolveContextRewrite(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  typeNamesAlongPath: string[],
  ca: MergedFieldContextArgument,
  variableCounter: { n: number },
  reservedVariableNames?: ReadonlySet<string>,
): StitchContextArgument | undefined {
  const providers = getContextProviders(schema, stitchingInfo, ca.context);
  if (!providers.length || typeNamesAlongPath.length < 2) {
    return undefined;
  }
  // Walk from entity toward root; nearest provider wins (exact or implementer).
  for (let i = typeNamesAlongPath.length - 2; i >= 0; i--) {
    const typeName = typeNamesAlongPath[i]!;
    if (!typeMatchesContextProvider(schema, typeName, providers)) {
      continue;
    }
    const parentDepth = typeNamesAlongPath.length - 1 - i;
    return {
      fieldName: '', // filled by caller
      argName: ca.name,
      variableName: allocateContextVariableName(variableCounter, reservedVariableNames),
      type: ca.type,
      parentDepth,
      providerTypeNames: [...providers],
      selectionPath: parseContextSelectionPath(ca.selection),
    };
  }
  return undefined;
}

/**
 * Field nodes to inject onto a context provider ancestor so the rewrite can
 * read them (like `@requires` bridges, but on the ancestor type).
 * Preserves nested selection trees (e.g. `userCurrency { isoCode }`).
 */
export function contextBridgeFieldsForSelection(
  stitchingInfo: StitchingInfo,
  subschema: Subschema,
  typeName: string,
  fieldName: string,
): SelectionNode[] {
  const cfg = findMergeFieldConfig(stitchingInfo, subschema, typeName, fieldName);
  if (!cfg?.contextArguments?.length) {
    return [];
  }
  const bridges: SelectionNode[] = [];
  const seen = new Set<string>();
  for (const ca of cfg.contextArguments) {
    for (const bridge of selectionStringToBridgeFields(ca.selection)) {
      const key = bridgeSelectionKey(bridge);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      bridges.push(bridge);
    }
  }
  return bridges;
}

function selectionStringToBridgeFields(selection: string): SelectionNode[] {
  const trimmed = selection.trim();
  const wrapped = trimmed.startsWith('{') ? trimmed : `{ ${trimmed} }`;
  let document;
  try {
    document = parse(wrapped, { noLocation: true });
  } catch {
    return [];
  }
  const op = document.definitions[0];
  if (op?.kind !== Kind.OPERATION_DEFINITION) {
    return [];
  }
  return selectionNodesToBridgeFields(op.selectionSet.selections);
}

/**
 * Bridge selections for injection onto a context provider. Typed inline
 * fragments are preserved so union/interface member paths keep their fields.
 */
function selectionNodesToBridgeFields(selections: readonly SelectionNode[]): SelectionNode[] {
  const out: SelectionNode[] = [];
  for (const sel of selections) {
    if (sel.kind === Kind.INLINE_FRAGMENT) {
      if (sel.typeCondition) {
        out.push({
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: sel.typeCondition,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: selectionNodesToBridgeFields(sel.selectionSet.selections),
          },
        });
      } else {
        out.push(...selectionNodesToBridgeFields(sel.selectionSet.selections));
      }
      continue;
    }
    if (sel.kind === Kind.FIELD) {
      out.push({
        kind: Kind.FIELD,
        name: { kind: Kind.NAME, value: sel.name.value },
        selectionSet: sel.selectionSet
          ? {
              kind: Kind.SELECTION_SET,
              selections: selectionNodesToBridgeFields(sel.selectionSet.selections),
            }
          : undefined,
      });
    }
  }
  return out;
}

function bridgeSelectionKey(sel: SelectionNode): string {
  if (sel.kind === Kind.INLINE_FRAGMENT) {
    const on = sel.typeCondition?.name.value ?? '';
    return `...${on}:{${sel.selectionSet.selections.map(bridgeSelectionKey).join(',')}}`;
  }
  if (sel.kind !== Kind.FIELD) {
    return '';
  }
  if (!sel.selectionSet?.selections.length) {
    return sel.name.value;
  }
  return `${sel.name.value}:{${sel.selectionSet.selections.map(bridgeSelectionKey).join(',')}}`;
}

/**
 * Inject context-selection bridges onto the nearest `@context` provider
 * ancestor inside a client selection tree. Contextual fields themselves stay
 * in the tree so the planner can defer them to entity hops.
 *
 * Example: `users { transactions { amount } }` where `amount` reads
 * `$userContext { currency }` becomes
 * `users { currency transactions { amount } }` so the root Fetch carries
 * the context value before the entity hop for `amount`.
 */
export function injectContextBridgesIntoSelections(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  parentTypeName: string,
  selections: readonly SelectionNode[],
): SelectionNode[] {
  const bridgesByProvider = new Map<string, Map<string, SelectionNode>>();

  function noteBridge(providerType: string, bridge: SelectionNode): void {
    let byName = bridgesByProvider.get(providerType);
    if (!byName) {
      byName = new Map();
      bridgesByProvider.set(providerType, byName);
    }
    const key = bridgeSelectionKey(bridge);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, bridge);
      return;
    }
    // Merge nested selection sets when the same bridge path is noted twice.
    if (
      bridge.kind === Kind.FIELD &&
      existing.kind === Kind.FIELD &&
      bridge.selectionSet &&
      existing.selectionSet
    ) {
      byName.set(key, {
        ...existing,
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: mergeBridgeFields(
            existing.selectionSet.selections,
            selectionNodesToBridgeFields(bridge.selectionSet.selections),
          ),
        },
      });
    }
  }

  function collect(
    typeName: string,
    sels: readonly SelectionNode[],
    ancestorTypes: string[],
  ): void {
    for (const sel of sels) {
      if (sel.kind === Kind.INLINE_FRAGMENT) {
        const on = sel.typeCondition?.name.value ?? typeName;
        collect(on, sel.selectionSet.selections, [...ancestorTypes, on]);
        continue;
      }
      if (sel.kind !== Kind.FIELD || sel.name.value.startsWith('__')) {
        continue;
      }
      const owner = resolveSubschemaOwningField(stitchingInfo, typeName, sel.name.value);
      if (owner) {
        const cfg = findMergeFieldConfig(stitchingInfo, owner, typeName, sel.name.value);
        if (cfg?.contextArguments?.length) {
          // Resolve the provider independently for each contextual argument.
          for (const ca of cfg.contextArguments) {
            const providers = getContextProviders(schema, stitchingInfo, ca.context);
            let provider: string | undefined;
            for (let i = ancestorTypes.length - 1; i >= 0; i--) {
              if (typeMatchesContextProvider(schema, ancestorTypes[i]!, providers)) {
                provider = ancestorTypes[i];
                break;
              }
            }
            if (!provider && typeMatchesContextProvider(schema, typeName, providers)) {
              provider = typeName;
            }
            if (!provider) {
              continue;
            }
            for (const bridge of selectionStringToBridgeFields(ca.selection)) {
              noteBridge(provider, bridge);
            }
          }
        }
      }
      if (!sel.selectionSet) {
        continue;
      }
      const parentType = schema.getType(typeName);
      const field =
        parentType && (isObjectType(parentType) || isInterfaceType(parentType))
          ? parentType.getFields()[sel.name.value]
          : undefined;
      if (!field) {
        continue;
      }
      const returnType = getNamedType(field.type as GraphQLOutputType);
      collect(returnType.name, sel.selectionSet.selections, [...ancestorTypes, returnType.name]);
    }
  }

  collect(parentTypeName, selections, [parentTypeName]);

  if (!bridgesByProvider.size) {
    return [...selections];
  }

  function inject(typeName: string, sels: readonly SelectionNode[]): SelectionNode[] {
    const next: SelectionNode[] = [];
    for (const sel of sels) {
      if (sel.kind === Kind.INLINE_FRAGMENT) {
        const on = sel.typeCondition?.name.value ?? typeName;
        next.push({
          ...sel,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: mergeBridgeFields(inject(on, sel.selectionSet.selections), bridgesFor(on)),
          },
        });
        continue;
      }
      if (sel.kind !== Kind.FIELD || !sel.selectionSet) {
        next.push(sel);
        continue;
      }
      const parentType = schema.getType(typeName);
      const field =
        parentType && (isObjectType(parentType) || isInterfaceType(parentType))
          ? parentType.getFields()[sel.name.value]
          : undefined;
      if (!field) {
        next.push(sel);
        continue;
      }
      const returnType = getNamedType(field.type as GraphQLOutputType);
      next.push({
        ...sel,
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: mergeBridgeFields(
            inject(returnType.name, sel.selectionSet.selections),
            bridgesFor(returnType.name),
          ),
        },
      });
    }
    return next;
  }

  function bridgesFor(typeName: string): SelectionNode[] {
    const byName = bridgesByProvider.get(typeName);
    return byName ? [...byName.values()] : [];
  }

  return mergeBridgeFields(inject(parentTypeName, selections), bridgesFor(parentTypeName));
}

/**
 * Prefer the subschema that owns the contextual / computed field config, not
 * merely the first subschema that merges the type.
 */
function resolveSubschemaOwningField(
  stitchingInfo: StitchingInfo,
  typeName: string,
  fieldName: string,
): Subschema | undefined {
  let fallback: Subschema | undefined;
  for (const [, sub] of stitchingInfo.subschemaMap) {
    const fields = sub.merge?.[typeName]?.fields?.[fieldName];
    if (!fields) {
      if (!fallback && sub.merge?.[typeName]) {
        fallback = sub;
      }
      continue;
    }
    if (fields.contextArguments?.length || fields.computed || fields.selectionSet) {
      return sub;
    }
    if (!fallback) {
      fallback = sub;
    }
  }
  return fallback;
}

function fieldHasConditionalDirective(field: FieldNode): boolean {
  return (field.directives ?? []).some(d => d.name.value === 'skip' || d.name.value === 'include');
}

/** Internal response-key prefix when a client field occupies the bridge key. */
export const CONTEXT_BRIDGE_ALIAS_PREFIX = '__mesh_ctx_';

/**
 * Merge bridge fields into a selection set. An aliased client selection of the
 * same schema field (e.g. `localCurrency: currency`) does **not** satisfy the
 * bridge: the rewrite reads the unaliased response key `currency`. Conditional
 * (`@skip`/`@include`) unaliased fields also do not satisfy the bridge.
 * When the bridge response key is occupied by a different field
 * (`currency: id`), inject the bridge under `__mesh_ctx_<name>` instead.
 */
function mergeBridgeFields(
  selections: readonly SelectionNode[],
  bridges: SelectionNode[],
): SelectionNode[] {
  if (!bridges.length) {
    return [...selections];
  }
  const seenUnaliased = new Set<string>();
  const occupiedResponseKeys = new Set<string>();
  const seenFragmentKeys = new Set<string>();
  const out: SelectionNode[] = [];
  for (const sel of selections) {
    if (sel.kind === Kind.FIELD) {
      occupiedResponseKeys.add(sel.alias?.value ?? sel.name.value);
      if (sel.alias == null && !fieldHasConditionalDirective(sel)) {
        seenUnaliased.add(sel.name.value);
      }
    }
    if (sel.kind === Kind.INLINE_FRAGMENT && sel.typeCondition) {
      seenFragmentKeys.add(bridgeSelectionKey(sel));
    }
    out.push(sel);
  }
  for (const b of bridges) {
    if (b.kind === Kind.INLINE_FRAGMENT) {
      const key = bridgeSelectionKey(b);
      if (!seenFragmentKeys.has(key)) {
        seenFragmentKeys.add(key);
        out.push(b);
      }
      continue;
    }
    if (b.kind !== Kind.FIELD) {
      out.push(b);
      continue;
    }
    if (seenUnaliased.has(b.name.value)) {
      // Merge nested bridge selections into the existing unaliased field.
      if (b.selectionSet) {
        const idx = out.findIndex(
          s =>
            s.kind === Kind.FIELD &&
            !s.alias &&
            !fieldHasConditionalDirective(s) &&
            s.name.value === b.name.value,
        );
        if (idx >= 0) {
          const existing = out[idx] as FieldNode;
          out[idx] = {
            ...existing,
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: mergeBridgeFields(
                existing.selectionSet?.selections ?? [],
                selectionNodesToBridgeFields(b.selectionSet.selections),
              ),
            },
          };
        }
      }
      continue;
    }
    // Response-key collision with a different field (e.g. `currency: id`).
    if (occupiedResponseKeys.has(b.name.value)) {
      const aliasName = `${CONTEXT_BRIDGE_ALIAS_PREFIX}${b.name.value}`;
      if (!occupiedResponseKeys.has(aliasName)) {
        const aliased: FieldNode = {
          ...b,
          alias: { kind: Kind.NAME, value: aliasName },
        };
        occupiedResponseKeys.add(aliasName);
        out.push(aliased);
      }
      continue;
    }
    seenUnaliased.add(b.name.value);
    occupiedResponseKeys.add(b.name.value);
    out.push(b);
  }
  return out;
}

/**
 * Read a context value from an ancestor object using rewrite path segments.
 * Returns `null` when the path does not apply (Federation sends null).
 */
export function readContextValue(
  ancestor: unknown,
  selectionPath: StitchContextPathSegment[],
  schema: GraphQLSchema,
): unknown {
  return selectAlongPath(ancestor, selectionPath, 0, schema);
}

/**
 * Nearest context-provider ancestor for a located entity. Prefers walking
 * `providerTypeNames` from the entity toward the root so multi-path Fetches
 * with different provider depths still resolve correctly; falls back to
 * `parentDepth` when providers are unknown.
 */
export function resolveContextAncestor(
  entity: Record<string, any>,
  ancestors: ReadonlyArray<Record<string, any>>,
  ca: Pick<StitchContextArgument, 'parentDepth' | 'providerTypeNames'>,
  schema: GraphQLSchema,
): Record<string, any> | undefined {
  const providers = ca.providerTypeNames ?? [];
  if (providers.length) {
    for (let d = 0; d <= ancestors.length; d++) {
      const ancestor = d === 0 ? entity : ancestors[ancestors.length - d];
      if (ancestor == null || typeof ancestor !== 'object') {
        continue;
      }
      const typename = (ancestor as Record<string, unknown>).__typename;
      if (typeof typename !== 'string') {
        continue;
      }
      if (providers.some(p => typename === p || typenameSatisfies(schema, typename, p))) {
        return ancestor as Record<string, any>;
      }
    }
    // Declared providers but none matched (e.g. non-provider concrete on the
    // same abstract path) — do not fall back to parentDepth.
    return undefined;
  }
  if (ca.parentDepth === 0) {
    return entity;
  }
  return ancestors[ancestors.length - ca.parentDepth];
}

function selectAlongPath(
  value: unknown,
  path: StitchContextPathSegment[],
  index: number,
  schema: GraphQLSchema,
): unknown {
  if (index >= path.length) {
    return value;
  }
  if (value == null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(item => selectAlongPath(item, path, index, schema) ?? null);
  }
  if (typeof value !== 'object') {
    return null;
  }
  const segment = path[index]!;
  if ('Alternatives' in segment) {
    // Try each type-conditioned branch; first matching typename wins.
    for (const alt of segment.Alternatives) {
      if (!alt.length) {
        continue;
      }
      const head = alt[0]!;
      if ('TypenameEquals' in head) {
        const typename = (value as Record<string, unknown>).__typename;
        if (typeof typename !== 'string') {
          continue;
        }
        const matches = head.TypenameEquals.some(cond => typenameSatisfies(schema, typename, cond));
        if (!matches) {
          continue;
        }
        return selectAlongPath(value, [...alt.slice(1), ...path.slice(index + 1)], 0, schema);
      }
      return selectAlongPath(value, [...alt, ...path.slice(index + 1)], 0, schema);
    }
    return null;
  }
  if ('TypenameEquals' in segment) {
    const typename = (value as Record<string, unknown>).__typename;
    if (typeof typename !== 'string') {
      return null;
    }
    const matches = segment.TypenameEquals.some(cond => typenameSatisfies(schema, typename, cond));
    if (!matches) {
      return null;
    }
    return selectAlongPath(value, path, index + 1, schema);
  }
  const record = value as Record<string, unknown>;
  // Prefer `__mesh_ctx_<key>` when present: the natural key may hold a
  // different field's value after a response-key collision (`currency: id`).
  const bridgedKey = `${CONTEXT_BRIDGE_ALIAS_PREFIX}${segment.Key}`;
  if (Object.hasOwn(record, bridgedKey)) {
    return selectAlongPath(record[bridgedKey], path, index + 1, schema);
  }
  if (Object.hasOwn(record, segment.Key)) {
    return selectAlongPath(record[segment.Key], path, index + 1, schema);
  }
  return null;
}

function typenameSatisfies(schema: GraphQLSchema, typename: string, condition: string): boolean {
  if (typename === condition) {
    return true;
  }
  const condType = schema.getType(condition);
  if (!condType || !isAbstractType(condType)) {
    return false;
  }
  const runtime = schema.getType(typename);
  if (!runtime || !isObjectType(runtime)) {
    return false;
  }
  return schema.isSubType(condType, runtime);
}

/**
 * Stable stringify for grouping context value tuples (order-sensitive arrays).
 */
export function stableStringifyContext(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const record = v as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(record).sort()) {
        sorted[k] = record[k];
      }
      return sorted;
    }
    return v;
  });
}
