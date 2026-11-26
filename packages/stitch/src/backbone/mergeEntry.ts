import {
  DocumentNode,
  getNamedType,
  GraphQLSchema,
  isAbstractType,
  isListType,
  isNonNullType,
  Kind,
  ListTypeNode,
  NamedTypeNode,
  NameNode,
  OperationTypeNode,
  SelectionSetNode,
  TypeNode,
  type GraphQLType,
} from 'graphql';
import type { MergedTypeEntryPoint, Subschema } from '@graphql-tools/delegate';
import { parseSelectionSet } from '@graphql-tools/utils';

export type BatchedMergeEntry = {
  fieldName: string;
  key: (originalResult: any) => any;
  argsFromKeys: (keys: ReadonlyArray<any>) => Record<string, any>;
  dataLoaderOptions?: { cacheKeyFn?: (key: any) => any };
};

/**
 * True when `parent` carries the top-level fields of an entry's selectionSet.
 * Used so multi-entry pick does not treat `{ upc: undefined }` from a naive
 * `({ upc }) => ({ upc })` key as a usable representation.
 */
export function entryPointAppliesToParent(
  entryPoint: Pick<MergedTypeEntryPoint, 'selectionSet'>,
  parent: any,
): boolean {
  if (parent == null || entryPoint.selectionSet == null) {
    return parent != null;
  }
  const selectionSet =
    typeof entryPoint.selectionSet === 'string'
      ? parseSelectionSet(entryPoint.selectionSet, { noLocation: true })
      : entryPoint.selectionSet;
  for (const sel of selectionSet.selections) {
    if (sel.kind !== Kind.FIELD || sel.name.value === '__typename') {
      continue;
    }
    if (parent[sel.name.value] === undefined) {
      return false;
    }
  }
  return true;
}

/**
 * Resolve a batched type-merge entry from subschema merge config.
 * Works for federation `_entities` and plain stitching (`usersByIds`, etc.).
 *
 * Multi-`entryPoints` (clone-less): when every entry shares the same merge
 * field, returns a composite `key` that picks the first entry whose selection
 * is present and key is non-null on the parent. Different fieldNames fall back
 * to the first usable entry (per-parent classic resolve still walks all entries).
 */
export function getBatchedMergeEntry(
  subschema: Subschema,
  typeName: string,
): BatchedMergeEntry | null {
  const mergeConfig = subschema.merge?.[typeName];
  if (!mergeConfig) {
    return null;
  }
  if (
    mergeConfig.key != null &&
    mergeConfig.argsFromKeys != null &&
    mergeConfig.fieldName != null
  ) {
    return {
      fieldName: mergeConfig.fieldName,
      key: mergeConfig.key,
      argsFromKeys: mergeConfig.argsFromKeys,
      dataLoaderOptions: mergeConfig.dataLoaderOptions,
    };
  }
  const eps = mergeConfig.entryPoints?.filter(
    e => e.key != null && e.argsFromKeys != null && e.fieldName != null,
  );
  if (eps == null || eps.length === 0) {
    return null;
  }
  if (eps.length === 1) {
    const ep = eps[0]!;
    return {
      fieldName: ep.fieldName!,
      key: ep.key!,
      argsFromKeys: ep.argsFromKeys!,
      dataLoaderOptions: ep.dataLoaderOptions,
    };
  }
  const first = eps[0]!;
  const sameField = eps.every(e => e.fieldName === first.fieldName);
  // Per-entry cacheKeyFns (federation keys on id vs upc) must not share one
  // identity - fall back to JSON of the representation when they differ.
  const cacheKeyFns = eps.map(e => e.dataLoaderOptions?.cacheKeyFn);
  const sharedCacheKeyFn = cacheKeyFns.every(fn => fn === cacheKeyFns[0])
    ? cacheKeyFns[0]
    : (key: any) => JSON.stringify(key);
  const compositeKey = (parent: any) => {
    for (const ep of eps) {
      if (!entryPointAppliesToParent(ep, parent)) {
        continue;
      }
      const k = ep.key!(parent);
      if (k != null) {
        return k;
      }
    }
    return null;
  };
  if (!sameField) {
    return {
      fieldName: first.fieldName!,
      key: compositeKey,
      // argsFromKeys may differ per fieldName; callers with mixed fieldNames
      // should not use the raw batch path - classic multi-entry resolve does.
      argsFromKeys: first.argsFromKeys!,
      dataLoaderOptions: {
        ...first.dataLoaderOptions,
        cacheKeyFn: sharedCacheKeyFn,
      },
    };
  }
  return {
    fieldName: first.fieldName!,
    key: compositeKey,
    argsFromKeys: first.argsFromKeys!,
    dataLoaderOptions: {
      ...first.dataLoaderOptions,
      cacheKeyFn: sharedCacheKeyFn,
    },
  };
}

/** Single arg name from `argsFromKeys([])` - multi-arg merges stay on Transformer. */
export function inferMergeArgName(
  argsFromKeys: (keys: ReadonlyArray<any>) => Record<string, any>,
): string | null {
  const sample = argsFromKeys([]);
  if (sample == null || typeof sample !== 'object') {
    return null;
  }
  const names = Object.keys(sample);
  return names.length === 1 ? names[0]! : null;
}

function typeToAST(type: GraphQLType): TypeNode {
  if (isNonNullType(type)) {
    // GraphQLNonNull.ofType is never itself NonNull; AST NonNull only wraps
    // Named | List.
    const ofType = typeToAST(type.ofType) as NamedTypeNode | ListTypeNode;
    return { kind: Kind.NON_NULL_TYPE, type: ofType };
  }
  if (isListType(type)) {
    return { kind: Kind.LIST_TYPE, type: typeToAST(type.ofType) };
  }
  return {
    kind: 'NamedType' as const,
    name: { kind: 'Name' as const, value: type.name },
  };
}

function mergeFieldSelection(
  schema: GraphQLSchema,
  fieldName: string,
  aliases: Array<{ entityTypeName: string; selectionSet: SelectionSetNode }>,
): SelectionSetNode | null {
  const queryType = schema.getQueryType();
  const field = queryType?.getFields()[fieldName];
  if (!field) {
    return null;
  }
  const namedReturn = getNamedType(field.type);
  const useInline =
    isAbstractType(namedReturn) ||
    aliases.length > 1 ||
    namedReturn.name !== aliases[0]!.entityTypeName;
  if (!useInline) {
    return aliases[0]!.selectionSet;
  }
  return {
    kind: 'SelectionSet' as const,
    selections: aliases.map(a => ({
      kind: 'InlineFragment' as const,
      typeCondition: {
        kind: 'NamedType' as const,
        name: {
          kind: 'Name' as const,
          value: a.entityTypeName,
        },
      },
      selectionSet: a.selectionSet,
    })),
  };
}

/**
 * Prebuilt merge hop document from MergedTypeConfig + subgraph schema
 * (not federation-hardcoded `_entities` / `representations` / `_Any`).
 * Forwards the client operation name when present (subgraph tracing/logs).
 */
export function buildBatchedMergeDocument(
  schema: GraphQLSchema,
  entry: BatchedMergeEntry,
  aliases: Array<{ entityTypeName: string; selectionSet: SelectionSetNode }>,
  operationName?: NameNode | string | null,
): DocumentNode | null {
  if (!aliases.length) {
    return null;
  }
  const argName = inferMergeArgName(entry.argsFromKeys);
  if (argName == null) {
    return null;
  }
  const queryType = schema.getQueryType();
  const field = queryType?.getFields()[entry.fieldName];
  const argDef = field?.args.find(a => a.name === argName);
  if (!field || !argDef) {
    return null;
  }
  const fieldSelection = mergeFieldSelection(schema, entry.fieldName, aliases);
  if (!fieldSelection) {
    return null;
  }
  const nameValue = typeof operationName === 'string' ? operationName : operationName?.value;
  return {
    kind: 'Document' as const,
    definitions: [
      {
        kind: 'OperationDefinition' as const,
        operation: 'query' as OperationTypeNode,
        name: nameValue ? { kind: 'Name' as const, value: nameValue } : undefined,
        variableDefinitions: [
          {
            kind: 'VariableDefinition' as const,
            variable: {
              kind: 'Variable' as const,
              name: { kind: 'Name' as const, value: argName },
            },
            type: typeToAST(argDef.type),
          },
        ],
        selectionSet: {
          kind: 'SelectionSet' as const,
          selections: [
            {
              kind: 'Field' as const,
              name: { kind: 'Name' as const, value: entry.fieldName },
              arguments: [
                {
                  kind: Kind.ARGUMENT,
                  name: { kind: 'Name' as const, value: argName },
                  value: {
                    kind: 'Variable' as const,
                    name: { kind: 'Name' as const, value: argName },
                  },
                },
              ],
              selectionSet: fieldSelection,
            },
          ],
        },
      },
    ],
  };
}
