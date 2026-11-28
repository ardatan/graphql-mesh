import {
  getNamedType,
  isAbstractType,
  isInterfaceType,
  isObjectType,
  Kind,
  parse,
  type FieldNode,
  type GraphQLOutputType,
  type GraphQLSchema,
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

function selectionSetToPath(selections: readonly SelectionNode[]): StitchContextPathSegment[] {
  const path: StitchContextPathSegment[] = [];
  for (const sel of selections) {
    if (sel.kind === Kind.INLINE_FRAGMENT) {
      if (sel.typeCondition) {
        path.push({ TypenameEquals: [sel.typeCondition.name.value] });
      }
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
  return path;
}

/**
 * Resolve object type names along a flatten path from the operation root
 * (list indexes are ignored; only field name segments matter).
 */
export function typeNamesAlongFlattenPath(
  schema: GraphQLSchema,
  flattenPath: PathSegment[],
): string[] {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return [];
  }
  const types: string[] = [queryType.name];
  let current: any = queryType;
  for (const segment of flattenPath) {
    if (typeof segment === 'number') {
      continue;
    }
    if (!current || !('getFields' in current)) {
      break;
    }
    const field = current.getFields()[segment];
    if (!field) {
      break;
    }
    const named = getNamedType(field.type as GraphQLOutputType);
    types.push(named.name);
    current = named;
  }
  return types;
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
): StitchContextArgument[] | undefined {
  const typeNames = typeNamesAlongFlattenPath(schema, flattenPath);
  // typeNames includes root; last entry is the entity type at flattenPath.
  const out: StitchContextArgument[] = [];
  for (const sel of selectionSet.selections) {
    if (sel.kind !== Kind.FIELD || sel.name.value === '__typename') {
      continue;
    }
    const cfg = findMergeFieldConfig(stitchingInfo, subschema, entityTypeName, sel.name.value);
    if (!cfg?.contextArguments?.length) {
      continue;
    }
    for (const ca of cfg.contextArguments) {
      const rewrite = resolveContextRewrite(stitchingInfo, typeNames, ca, variableCounter);
      if (rewrite) {
        out.push({ ...rewrite, fieldName: sel.name.value });
      }
    }
  }
  return out.length ? out : undefined;
}

function resolveContextRewrite(
  stitchingInfo: StitchingInfo,
  typeNamesAlongPath: string[],
  ca: MergedFieldContextArgument,
  variableCounter: { n: number },
): StitchContextArgument | undefined {
  const providers = stitchingInfo.contextProviders?.[ca.context] ?? [];
  if (!providers.length || typeNamesAlongPath.length < 2) {
    return undefined;
  }
  // Walk from entity toward root; nearest provider wins.
  for (let i = typeNamesAlongPath.length - 2; i >= 0; i--) {
    const typeName = typeNamesAlongPath[i]!;
    if (!providers.includes(typeName)) {
      continue;
    }
    const parentDepth = typeNamesAlongPath.length - 1 - i;
    const variableName = `__context_${variableCounter.n++}`;
    return {
      fieldName: '', // filled by caller
      argName: ca.name,
      variableName,
      type: ca.type,
      parentDepth,
      selectionPath: parseContextSelectionPath(ca.selection),
    };
  }
  return undefined;
}

/**
 * Field nodes to inject onto a context provider ancestor so the rewrite can
 * read them (like `@requires` bridges, but on the ancestor type).
 */
export function contextBridgeFieldsForSelection(
  stitchingInfo: StitchingInfo,
  subschema: Subschema,
  typeName: string,
  fieldName: string,
): FieldNode[] {
  const cfg = findMergeFieldConfig(stitchingInfo, subschema, typeName, fieldName);
  if (!cfg?.contextArguments?.length) {
    return [];
  }
  const bridges: FieldNode[] = [];
  const seen = new Set<string>();
  for (const ca of cfg.contextArguments) {
    for (const segment of parseContextSelectionPath(ca.selection)) {
      if (!('Key' in segment)) {
        continue;
      }
      if (seen.has(segment.Key)) {
        continue;
      }
      seen.add(segment.Key);
      bridges.push({
        kind: Kind.FIELD,
        name: { kind: Kind.NAME, value: segment.Key },
      });
    }
  }
  return bridges;
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
  const bridgesByProvider = new Map<string, Map<string, FieldNode>>();

  function noteBridge(providerType: string, bridge: FieldNode): void {
    let byName = bridgesByProvider.get(providerType);
    if (!byName) {
      byName = new Map();
      bridgesByProvider.set(providerType, byName);
    }
    if (!byName.has(bridge.name.value)) {
      byName.set(bridge.name.value, bridge);
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
      const owner = resolveSubschemaForType(stitchingInfo, undefined, typeName);
      if (owner) {
        const cfg = findMergeFieldConfig(stitchingInfo, owner, typeName, sel.name.value);
        if (cfg?.contextArguments?.length) {
          const providers =
            stitchingInfo.contextProviders?.[cfg.contextArguments[0]!.context] ?? [];
          let provider: string | undefined;
          for (let i = ancestorTypes.length - 1; i >= 0; i--) {
            if (providers.includes(ancestorTypes[i]!)) {
              provider = ancestorTypes[i];
              break;
            }
          }
          // Same-type provider (rare): treat current type as provider.
          if (!provider && providers.includes(typeName)) {
            provider = typeName;
          }
          if (provider) {
            for (const bridge of contextBridgeFieldsForSelection(
              stitchingInfo,
              owner,
              typeName,
              sel.name.value,
            )) {
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

  function bridgesFor(typeName: string): FieldNode[] {
    const byName = bridgesByProvider.get(typeName);
    return byName ? [...byName.values()] : [];
  }

  return mergeBridgeFields(inject(parentTypeName, selections), bridgesFor(parentTypeName));
}

function resolveSubschemaForType(
  stitchingInfo: StitchingInfo,
  hint: Subschema | undefined,
  typeName: string,
): Subschema | undefined {
  if (hint?.merge?.[typeName]) {
    return hint;
  }
  for (const [, sub] of stitchingInfo.subschemaMap) {
    if (sub.merge?.[typeName]) {
      return sub;
    }
  }
  return hint;
}

function mergeBridgeFields(
  selections: readonly SelectionNode[],
  bridges: FieldNode[],
): SelectionNode[] {
  if (!bridges.length) {
    return [...selections];
  }
  const seen = new Set<string>();
  const out: SelectionNode[] = [];
  for (const sel of selections) {
    if (sel.kind === Kind.FIELD) {
      seen.add(sel.name.value);
    }
    out.push(sel);
  }
  for (const b of bridges) {
    if (seen.has(b.name.value)) {
      continue;
    }
    seen.add(b.name.value);
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
  if (!Object.hasOwn(value as object, segment.Key)) {
    return null;
  }
  return selectAlongPath((value as Record<string, unknown>)[segment.Key], path, index + 1, schema);
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
