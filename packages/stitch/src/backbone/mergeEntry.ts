import {
  getNamedType,
  isAbstractType,
  isListType,
  isNonNullType,
  Kind,
  visit,
  type DocumentNode,
  type GraphQLSchema,
  type GraphQLType,
  type ListTypeNode,
  type NamedTypeNode,
  type NameNode,
  type OperationDefinitionNode,
  type OperationTypeNode,
  type SelectionSetNode,
  type TypeNode,
  type VariableDefinitionNode,
} from 'graphql';
import type { MergedTypeEntryPoint, Subschema } from '@graphql-tools/delegate';
import { parseSelectionSet } from '@graphql-tools/utils';

export type BatchedMergeEntry = {
  fieldName: string;
  key: (originalResult: any) => any;
  argsFromKeys: (keys: ReadonlyArray<any>) => Record<string, any>;
  valuesFromResults?: (results: any, keys?: ReadonlyArray<any>) => any;
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
      valuesFromResults: mergeConfig.valuesFromResults,
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
      // Parent merge defaults overlay onto entryPoints in stitchingInfo; honor
      // per-entry valuesFromResults when set, else the type-level default.
      valuesFromResults: ep.valuesFromResults ?? mergeConfig.valuesFromResults,
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
  // Prefer a shared valuesFromResults when every entry agrees (or only the
  // type-level default is set). Conflicting callbacks must not use the
  // positional raw-batch/merge path (undefined would look like "no unwrap"
  // and mis-assign reordered results) - fall back to classic multi-entry.
  const valuesFns = eps.map(e => e.valuesFromResults ?? mergeConfig.valuesFromResults);
  const valuesAgree = valuesFns.every(fn => fn === valuesFns[0]);
  if (!valuesAgree) {
    return null;
  }
  const sharedValuesFromResults = valuesFns[0];
  if (!sameField) {
    return {
      fieldName: first.fieldName!,
      key: compositeKey,
      // argsFromKeys may differ per fieldName; callers with mixed fieldNames
      // should not use the raw batch path - classic multi-entry resolve does.
      argsFromKeys: first.argsFromKeys!,
      valuesFromResults: sharedValuesFromResults,
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
    valuesFromResults: sharedValuesFromResults,
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
    kind: Kind.NAMED_TYPE,
    name: { kind: Kind.NAME, value: type.name },
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
    kind: Kind.SELECTION_SET,
    selections: aliases.map(a => ({
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: {
        kind: Kind.NAMED_TYPE,
        name: {
          kind: Kind.NAME,
          value: a.entityTypeName,
        },
      },
      selectionSet: a.selectionSet,
    })),
  };
}

export type BatchedMergeDocumentResult = {
  document: DocumentNode;
  /**
   * Client variables used by the selection (`@include`/`@skip`/field args),
   * excluding the merge-arg name (`representations`). Execute binds these from
   * `variableValues` alongside `argsFromKeys`.
   */
  clientVariableNames: readonly string[];
};

/**
 * Prebuilt merge hop document from MergedTypeConfig + subgraph schema
 * (not federation-hardcoded `_entities` / `representations` / `_Any`).
 * Forwards the client operation name when present (subgraph tracing/logs).
 *
 * When `operation` is provided, client variables referenced by alias
 * selections (e.g. `@include(if: $title)`) are declared on the document so
 * execute can skip Transformer without "Variable $x is not defined".
 */
export function buildBatchedMergeDocument(
  schema: GraphQLSchema,
  entry: BatchedMergeEntry,
  aliases: Array<{ entityTypeName: string; selectionSet: SelectionSetNode }>,
  operationName?: NameNode | string | null,
  operation?: OperationDefinitionNode | null,
): BatchedMergeDocumentResult | null {
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
  const usedClientVars = new Set<string>();
  for (const a of aliases) {
    visit(a.selectionSet, {
      Variable(v) {
        if (v.name.value !== argName) {
          usedClientVars.add(v.name.value);
        }
      },
    });
  }
  const clientDefs: VariableDefinitionNode[] = [];
  const clientVariableNames: string[] = [];
  if (usedClientVars.size && operation?.variableDefinitions?.length) {
    for (const def of operation.variableDefinitions) {
      const name = def.variable.name.value;
      if (usedClientVars.has(name) && name !== argName) {
        clientDefs.push(def);
        clientVariableNames.push(name);
      }
    }
  }
  const nameValue = typeof operationName === 'string' ? operationName : operationName?.value;
  const variableDefinitions: VariableDefinitionNode[] = [
    {
      kind: Kind.VARIABLE_DEFINITION,
      variable: {
        kind: Kind.VARIABLE,
        name: { kind: Kind.NAME, value: argName },
      },
      type: typeToAST(argDef.type),
    },
    ...clientDefs,
  ];
  return {
    document: {
      kind: Kind.DOCUMENT,
      definitions: [
        {
          kind: Kind.OPERATION_DEFINITION,
          operation: 'query' as OperationTypeNode,
          name: nameValue ? { kind: Kind.NAME, value: nameValue } : undefined,
          variableDefinitions,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [
              {
                kind: Kind.FIELD,
                name: { kind: Kind.NAME, value: entry.fieldName },
                arguments: [
                  {
                    kind: Kind.ARGUMENT,
                    name: { kind: Kind.NAME, value: argName },
                    value: {
                      kind: Kind.VARIABLE,
                      name: { kind: Kind.NAME, value: argName },
                    },
                  },
                ],
                selectionSet: fieldSelection,
              },
            ],
          },
        },
      ],
    },
    clientVariableNames,
  };
}
