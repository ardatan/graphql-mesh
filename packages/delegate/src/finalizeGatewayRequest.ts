import {
  getNamedType,
  GraphQLError,
  isAbstractType,
  isCompositeType,
  isInterfaceType,
  isLeafType,
  isNullableType,
  isObjectType,
  isUnionType,
  Kind,
  visit,
  visitWithTypeInfo,
  type ASTNode,
  type DirectiveNode,
  type DocumentNode,
  type FragmentDefinitionNode,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type GraphQLType,
  type InlineFragmentNode,
  type OperationDefinitionNode,
  type SelectionNode,
  type SelectionSetNode,
  type TypeInfo,
  type ValueNode,
  type VariableDefinitionNode,
} from 'graphql';
import { CRITICAL_ERROR } from '@graphql-tools/executor';
import {
  getDefinedRootType,
  implementsAbstractType,
  memoize1,
  memoize2,
  type ASTVisitorKeyMap,
  type ExecutionRequest,
} from '@graphql-tools/utils';
import { getCoercedVariableValues } from './getCoercedVariableValues.js';
import { getDocumentMetadata } from './getDocumentMetadata.js';
import { getTypeInfo, getTypeInfoWithType } from './getTypeInfo.js';
import { handleOverrideByDelegation } from './handleOverrideByDelegation.js';
import { type Subschema } from './Subschema.js';
import { type DelegationContext, type StitchingInfo } from './types.js';

function finalizeGatewayDocument<TContext>(
  targetSchema: GraphQLSchema,
  originalDocument: DocumentNode,
  fragments: FragmentDefinitionNode[],
  operations: OperationDefinitionNode[],
  onOverlappingAliases: () => void,
  delegationContext: DelegationContext<TContext>,
) {
  let usedVariables: Array<string> = [];
  let usedFragments: Array<string> = [];
  const newOperations: Array<OperationDefinitionNode> = [];
  let newFragments: Array<FragmentDefinitionNode> = [];

  const validFragments: Array<FragmentDefinitionNode> = [];
  const validFragmentsWithType: Record<string, GraphQLNamedType> = Object.create(null);
  for (const fragment of fragments) {
    if (fragment.selectionSet.selections.length === 0) {
      continue;
    }
    const typeName = fragment.typeCondition.name.value;
    const type = targetSchema.getType(typeName);
    if (type != null) {
      validFragments.push(fragment);
      validFragmentsWithType[fragment.name.value] = type;
    }
  }

  let fragmentSet = Object.create(null);
  let selectionCnt = 0;

  for (const operation of operations) {
    const type = getDefinedRootType(targetSchema, operation.operation);

    const {
      selectionSet,
      usedFragments: operationUsedFragments,
      usedVariables: operationUsedVariables,
    } = finalizeSelectionSet(
      targetSchema,
      type,
      validFragmentsWithType,
      operation.selectionSet,
      onOverlappingAliases,
      delegationContext,
      validFragments,
    );

    usedFragments = union(usedFragments, operationUsedFragments);

    const {
      usedVariables: collectedUsedVariables,
      newFragments: collectedNewFragments,
      fragmentSet: collectedFragmentSet,
    } = collectFragmentVariables(
      targetSchema,
      fragmentSet,
      validFragments,
      validFragmentsWithType,
      usedFragments,
      onOverlappingAliases,
      delegationContext,
    );
    const operationOrFragmentVariables = union(operationUsedVariables, collectedUsedVariables);
    usedVariables = union(usedVariables, operationOrFragmentVariables);
    // Accumulate fragments across operations; do not replace earlier ones.
    newFragments = [...newFragments, ...collectedNewFragments];
    fragmentSet = collectedFragmentSet;

    const variableDefinitions: VariableDefinitionNode[] = [];

    for (const variableName of operationOrFragmentVariables) {
      const variableDef = operation.variableDefinitions?.find(
        varDef => varDef.variable.name.value === variableName,
      );
      if (variableDef != null) {
        variableDefinitions.push(variableDef);
      }
    }

    // Prevent unnecessary __typename in Subscription
    if (operation.operation === 'subscription') {
      selectionSet.selections = selectionSet.selections.filter(
        (selection: SelectionNode) =>
          selection.kind !== Kind.FIELD || selection.name.value !== '__typename',
      );
    }

    // Do not add the operation if it only asks for __typename
    if (
      selectionSet.selections.length === 1 &&
      selectionSet.selections[0] &&
      selectionSet.selections[0].kind === Kind.FIELD &&
      selectionSet.selections[0].name.value === '__typename'
    ) {
      continue;
    }

    selectionCnt += selectionSet.selections.length;

    newOperations.push({
      kind: Kind.OPERATION_DEFINITION,
      operation: operation.operation,
      name: operation.name,
      directives: operation.directives,
      variableDefinitions,
      selectionSet,
    });
  }

  if (!newOperations.length || selectionCnt === 0) {
    throw new GraphQLError(
      'Failed to create a gateway request. The request must contain at least one operation.',
      {
        extensions: {
          [CRITICAL_ERROR]: true,
        },
      },
    );
  }

  const includedFragmentNames = new Set(newFragments.map(f => f.name.value));
  const hasDroppedFragments = includedFragmentNames.size < usedFragments.length;

  let newDocument: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: [...newOperations, ...newFragments],
  };

  const stitchingInfo = delegationContext.info?.schema?.extensions?.stitchingInfo as StitchingInfo;
  // Skip the (relatively expensive) `@provides` traversal entirely when the
  // current subschema has no provided selections configured. This avoids
  // walking the entire document twice on every delegation for non-federated
  // subgraphs or subgraphs that do not participate in `@provides`.
  // Variables newly referenced by @provides-injected selections (if any).
  let providesInjectedVariables: string[] | undefined;
  if (
    stitchingInfo != null &&
    subschemaHasProvidedSelections(stitchingInfo, delegationContext.subschema as Subschema)
  ) {
    // Capture the user's original selection sets keyed by path so that we can
    // restrict the `@provides` injection below to only the fields the client
    // actually requested. Without this, every field listed in `@provides` would
    // be sent to the providing subgraph even when the client never asked for it.
    const {
      selectionSetsByPath: originalFieldSelectionSetsByPath,
      fragments: originalFragmentsByName,
    } = collectFieldSelectionSetsByPath(originalDocument);
    const typeInfo = getTypeInfo(targetSchema);
    const pathStack: string[] = [];
    // Per-selection-set sibling counters used to disambiguate untyped or
    // repeated inline fragments (e.g. `... { ... }` siblings) so that path
    // keys built during the visit match the keys produced by
    // `collectFieldSelectionSetsByPath` exactly.
    const inlineFragmentCounterStack: Array<Map<string, number>> = [];
    newDocument = visit(
      newDocument,
      visitWithTypeInfo(typeInfo, {
        [Kind.SELECTION_SET]: {
          enter() {
            inlineFragmentCounterStack.push(new Map());
          },
          leave() {
            inlineFragmentCounterStack.pop();
          },
        },
        [Kind.OPERATION_DEFINITION]: {
          enter(node) {
            pathStack.push(`op:${node.operation}:${node.name?.value ?? ''}`);
          },
          leave() {
            pathStack.pop();
          },
        },
        [Kind.FRAGMENT_DEFINITION]: {
          enter(node) {
            pathStack.push(`frag:${node.name.value}`);
          },
          leave() {
            pathStack.pop();
          },
        },
        [Kind.INLINE_FRAGMENT]: {
          enter(node) {
            // The inline fragment's own SelectionSet has not been entered yet,
            // so the top of the stack still belongs to the enclosing selection
            // set whose siblings we need to disambiguate.
            pathStack.push(
              nextInlineFragmentPathSegment(
                node,
                inlineFragmentCounterStack[inlineFragmentCounterStack.length - 1],
              ),
            );
          },
          leave() {
            pathStack.pop();
          },
        },
        [Kind.FIELD]: {
          enter(fieldNode) {
            pathStack.push(fieldNode.alias?.value ?? fieldNode.name.value);
          },
          leave(fieldNode) {
            try {
              const parentType = typeInfo.getParentType();
              if (!parentType) {
                return undefined;
              }
              const typeConfig = stitchingInfo?.mergedTypes?.[parentType.name];
              const providedSelectionsByField = typeConfig?.providedSelectionsByField?.get(
                delegationContext.subschema as Subschema,
              );
              const providedSelection = providedSelectionsByField?.[fieldNode.name.value];
              if (!providedSelection) {
                return undefined;
              }
              const originalSelectionSet = lookupOriginalSelectionSet(
                pathStack,
                fieldNode,
                originalFieldSelectionSetsByPath,
              );
              const requestedProvidedSelections = intersectProvidedSelections(
                providedSelection.selections,
                originalSelectionSet,
                originalFragmentsByName,
              );
              if (!requestedProvidedSelections.length) {
                return undefined;
              }
              // Collect vars from injected selections only (avoid a second full visit).
              const injectedVars = collectVariableNamesFromSelections(requestedProvidedSelections);
              if (injectedVars.length) {
                providesInjectedVariables = providesInjectedVariables
                  ? union(providesInjectedVariables, injectedVars)
                  : injectedVars;
              }
              return {
                ...fieldNode,
                selectionSet: {
                  kind: Kind.SELECTION_SET,
                  selections: [
                    ...requestedProvidedSelections,
                    ...(fieldNode.selectionSet?.selections ?? []),
                  ],
                },
              };
            } finally {
              pathStack.pop();
            }
          },
        },
      }),
    );
  }

  // strip dangling fragment spreads that point to fragments that were dropped
  // because all their fields are @external in the target subgraph. this must
  // run after the @provides injection so that provided fields are already
  // inlined before the now-empty spreads are removed.
  if (hasDroppedFragments) {
    const ops = newDocument.definitions.filter(
      (d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION,
    );
    const frags = newDocument.definitions.filter(
      (d): d is FragmentDefinitionNode => d.kind === Kind.FRAGMENT_DEFINITION,
    );
    const cleaned = removeDeadFragmentSpreads(ops, frags, includedFragmentNames);
    newDocument = {
      kind: Kind.DOCUMENT,
      definitions: [...cleaned.operations, ...cleaned.fragments],
    };
  }

  // Sync operation variableDefinitions only when @provides injected selections
  // that reference variables not already collected on the first pass.
  if (providesInjectedVariables?.length) {
    usedVariables = union(usedVariables, providesInjectedVariables);
    newDocument = syncOperationVariableDefinitions(newDocument, operations, usedVariables);
  }

  return {
    usedVariables,
    newDocument,
  };
}

export function finalizeGatewayRequest<TContext>(
  originalRequest: ExecutionRequest,
  delegationContext: DelegationContext<TContext>,
  onOverlappingAliases: () => void,
): ExecutionRequest {
  const { operations, fragments } = getDocumentMetadata(originalRequest.document);
  const { targetSchema } = delegationContext;

  const { usedVariables, newDocument } = finalizeGatewayDocument(
    targetSchema,
    originalRequest.document,
    fragments,
    operations,
    onOverlappingAliases,
    delegationContext,
  );

  const newVariables: Record<string, any> = {};
  const outerVariables = getCoercedVariableValues(delegationContext.info?.variableValues);

  for (const varName of usedVariables) {
    // Explicit request variables (including null) take precedence over resolve-info values.
    if (
      originalRequest.variables != null &&
      Object.prototype.hasOwnProperty.call(originalRequest.variables, varName)
    ) {
      newVariables[varName] = originalRequest.variables[varName];
    } else if (
      outerVariables != null &&
      Object.prototype.hasOwnProperty.call(outerVariables, varName)
    ) {
      newVariables[varName] = outerVariables[varName];
    }
  }

  return {
    ...originalRequest,
    document: newDocument,
    variables: newVariables,
  };
}

function removeDeadFragmentSpreads(
  operations: OperationDefinitionNode[],
  fragments: FragmentDefinitionNode[],
  included: Set<string>,
): { operations: OperationDefinitionNode[]; fragments: FragmentDefinitionNode[] } {
  function cleanSelections(
    selections: readonly SelectionNode[],
    live: Set<string>,
  ): SelectionNode[] {
    const out: SelectionNode[] = [];
    for (const sel of selections) {
      if (sel.kind === Kind.FRAGMENT_SPREAD) {
        if (live.has(sel.name.value)) {
          out.push(sel);
        }
        // drop spreads referencing dropped (empty) fragments
      } else if (
        (sel.kind === Kind.FIELD || sel.kind === Kind.INLINE_FRAGMENT) &&
        sel.selectionSet
      ) {
        const cleaned = cleanSelections(sel.selectionSet.selections, live);
        if (cleaned.length === 0 && sel.kind === Kind.INLINE_FRAGMENT) {
          // inline fragment became empty, drop it
          continue;
        }
        if (cleaned.length === 0 && sel.kind === Kind.FIELD) {
          // composite field with no remaining selections, drop it
          continue;
        }
        out.push(
          cleaned === sel.selectionSet.selections
            ? sel
            : {
                ...sel,
                selectionSet: {
                  kind: Kind.SELECTION_SET,
                  selections: cleaned,
                },
              },
        );
      } else {
        out.push(sel);
      }
    }
    return out;
  }

  // Iteratively drop fragments that have no valid selections after pruning
  // spreads to missing/empty targets, then re-prune until stable.
  let live = new Set(included);
  let currentFrags = fragments.filter(f => live.has(f.name.value));
  let changed = true;
  while (changed) {
    changed = false;
    const nextFrags: FragmentDefinitionNode[] = [];
    const nextLive = new Set<string>();
    for (const frag of currentFrags) {
      const cleanedSelections = cleanSelections(frag.selectionSet.selections, live);
      if (cleanedSelections.length === 0) {
        changed = true;
        continue;
      }
      nextLive.add(frag.name.value);
      nextFrags.push(
        cleanedSelections === frag.selectionSet.selections
          ? frag
          : {
              ...frag,
              selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: cleanedSelections,
              },
            },
      );
    }
    if (nextLive.size !== live.size) {
      changed = true;
    }
    live = nextLive;
    currentFrags = nextFrags;
  }

  const cleanedOps = operations.map(op => ({
    ...op,
    selectionSet: {
      ...op.selectionSet,
      selections: cleanSelections(op.selectionSet.selections, live),
    },
  }));

  return { operations: cleanedOps, fragments: currentFrags };
}

/** Collect variable names from a selection list (arguments + directives), no full visit. */
function collectVariableNamesFromSelections(selections: readonly SelectionNode[]): string[] {
  const used: string[] = [];
  const seen = new Set<string>();
  function add(name: string) {
    if (!seen.has(name)) {
      seen.add(name);
      used.push(name);
    }
  }
  function walkValue(value: ValueNode) {
    if (value.kind === Kind.VARIABLE) {
      add(value.name.value);
    } else if (value.kind === Kind.LIST) {
      for (const v of value.values) walkValue(v);
    } else if (value.kind === Kind.OBJECT) {
      for (const f of value.fields) walkValue(f.value);
    }
  }
  function walkDirectives(directives: readonly DirectiveNode[] | undefined) {
    if (directives == null) return;
    for (const d of directives) {
      if (d.arguments) {
        for (const arg of d.arguments) walkValue(arg.value);
      }
    }
  }
  function walk(sels: readonly SelectionNode[]) {
    for (const sel of sels) {
      walkDirectives(sel.directives);
      if (sel.kind === Kind.FIELD) {
        if (sel.arguments) {
          for (const arg of sel.arguments) walkValue(arg.value);
        }
        if (sel.selectionSet) walk(sel.selectionSet.selections);
      } else if (sel.kind === Kind.INLINE_FRAGMENT) {
        walk(sel.selectionSet.selections);
      }
      // Fragment spreads: directives only (body lives in fragment defs).
    }
  }
  walk(selections);
  return used;
}

/**
 * Rebuild each operation's variableDefinitions from the original operations'
 * definitions for every variable still referenced after @provides injection.
 */
function syncOperationVariableDefinitions(
  document: DocumentNode,
  originalOperations: OperationDefinitionNode[],
  usedVariables: string[],
): DocumentNode {
  const usedSet = new Set(usedVariables);
  const originalByKey = new Map<string, OperationDefinitionNode>();
  for (const op of originalOperations) {
    originalByKey.set(`${op.operation}:${op.name?.value ?? ''}`, op);
  }
  return {
    ...document,
    definitions: document.definitions.map(def => {
      if (def.kind !== Kind.OPERATION_DEFINITION) {
        return def;
      }
      const original = originalByKey.get(`${def.operation}:${def.name?.value ?? ''}`);
      const sourceDefs = original?.variableDefinitions ?? def.variableDefinitions ?? [];
      const variableDefinitions = sourceDefs.filter(varDef =>
        usedSet.has(varDef.variable.name.value),
      );
      return {
        ...def,
        variableDefinitions,
      };
    }),
  };
}

function isTypeNameField(selection: SelectionNode): boolean {
  return selection.kind === Kind.FIELD && !selection.alias && selection.name.value === '__typename';
}

function collectFieldSelectionSetsByPathImpl(document: DocumentNode): {
  selectionSetsByPath: Map<string, SelectionSetNode>;
  fragments: Map<string, FragmentDefinitionNode>;
} {
  const selectionSetsByPath = new Map<string, SelectionSetNode>();
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const def of document.definitions) {
    if (def.kind === Kind.FRAGMENT_DEFINITION) {
      fragments.set(def.name.value, def);
    }
  }
  const pathStack: string[] = [];
  // Per-selection-set sibling counters used to disambiguate untyped or repeated
  // inline fragments (e.g. `... { a } ... { b }`) so each sibling produces a
  // unique path key.
  const inlineFragmentCounterStack: Array<Map<string, number>> = [];
  visit(document, {
    [Kind.SELECTION_SET]: {
      enter() {
        inlineFragmentCounterStack.push(new Map());
      },
      leave() {
        inlineFragmentCounterStack.pop();
      },
    },
    [Kind.OPERATION_DEFINITION]: {
      enter(node) {
        pathStack.push(`op:${node.operation}:${node.name?.value ?? ''}`);
      },
      leave() {
        pathStack.pop();
      },
    },
    [Kind.FRAGMENT_DEFINITION]: {
      enter(node) {
        pathStack.push(`frag:${node.name.value}`);
      },
      leave() {
        pathStack.pop();
      },
    },
    [Kind.INLINE_FRAGMENT]: {
      enter(node) {
        pathStack.push(
          nextInlineFragmentPathSegment(
            node,
            inlineFragmentCounterStack[inlineFragmentCounterStack.length - 1],
          ),
        );
      },
      leave() {
        pathStack.pop();
      },
    },
    [Kind.FIELD]: {
      enter(node) {
        pathStack.push(node.alias?.value ?? node.name.value);
        if (node.selectionSet) {
          selectionSetsByPath.set(pathStack.join('>'), node.selectionSet);
          if (node.alias) {
            // Also index the selection set by the response key built from the
            // field name. Some downstream transforms (e.g. the nullable/non
            // nullable alias handling) inject synthetic aliases that the
            // visit-time path stack would fail to find otherwise.
            const namePath = [...pathStack.slice(0, -1), node.name.value].join('>');
            if (!selectionSetsByPath.has(namePath)) {
              selectionSetsByPath.set(namePath, node.selectionSet);
            }
          }
        }
      },
      leave() {
        pathStack.pop();
      },
    },
  });
  return { selectionSetsByPath, fragments };
}

// Memoized so the original document is only walked once across the lifetime of
// a request even if multiple subschemas ask for the same lookup map.
const collectFieldSelectionSetsByPath = memoize1(collectFieldSelectionSetsByPathImpl);

function nextInlineFragmentPathSegment(
  node: { typeCondition?: { name: { value: string } } | undefined | null },
  counter: Map<string, number> | undefined,
): string {
  const typeName = node.typeCondition?.name.value ?? '';
  if (!counter) {
    return `inline:${typeName}:0`;
  }
  const idx = counter.get(typeName) ?? 0;
  counter.set(typeName, idx + 1);
  return `inline:${typeName}:${idx}`;
}

function subschemaHasProvidedSelectionsImpl(
  stitchingInfo: StitchingInfo,
  subschema: Subschema,
): boolean {
  const mergedTypes = stitchingInfo.mergedTypes;
  if (!mergedTypes) {
    return false;
  }
  for (const typeConfig of Object.values(mergedTypes)) {
    if (typeConfig?.providedSelectionsByField?.has(subschema)) {
      return true;
    }
  }
  return false;
}

// Memoized because both `stitchingInfo` and `subschema` are stable for the
// lifetime of a stitched schema, so this is effectively a one-time scan per
// (schema, subschema) pair instead of per delegation.
const subschemaHasProvidedSelections = memoize2(subschemaHasProvidedSelectionsImpl);

/** Drop inline-fragment sibling indices so filtered docs still match originals. */
function normalizeProvidesPath(path: string): string {
  return path.replace(/inline:([^:>]+):\d+/g, 'inline:$1');
}

function lookupOriginalSelectionSet(
  pathStack: string[],
  fieldNode: { name: { value: string }; alias?: { value: string } | undefined },
  selectionSetsByPath: Map<string, SelectionSetNode>,
): SelectionSetNode | undefined {
  const key = pathStack.join('>');
  const exact = selectionSetsByPath.get(key);
  if (exact) {
    return exact;
  }
  // Fallback: downstream transforms may rewrite the alias (for example to
  // `_nullable_<fieldName>` when reconciling overlapping nullable / non-null
  // selections). The collection step also indexes those selection sets under
  // the field's name so we can recover them here.
  if (fieldNode.alias) {
    const fallback = [...pathStack.slice(0, -1), fieldNode.name.value].join('>');
    const byName = selectionSetsByPath.get(fallback);
    if (byName) {
      return byName;
    }
  }
  // Filtering may drop an earlier sibling inline fragment, shifting indices
  // (`inline:Product:1` in the original map vs `inline:Product:0` on the
  // rewritten document). Match on type name only so `@provides` still injects.
  const normalized = normalizeProvidesPath(key);
  if (normalized !== key) {
    for (const [path, ss] of selectionSetsByPath) {
      if (normalizeProvidesPath(path) === normalized) {
        return ss;
      }
    }
  }
  return undefined;
}

/**
 * Returns the subset of `@provides` selections that the client actually
 * requested at this path. `@provides` only allows the providing subgraph to
 * resolve the listed fields; it does NOT mean the gateway should fetch all of
 * them on every visit. We therefore intersect with the original (pre-filter)
 * selection set so that fields the client never asked for are not pulled in.
 *
 * We return the original field nodes (preserving aliases and arguments) so the
 * subgraph response can be matched back to the user's request. Inline fragment
 * and fragment-spread wrappers that carry directives such as `@include` /
 * `@skip` are preserved so client-supplied conditions are still honored.
 */
function intersectProvidedSelections(
  providedSelections: readonly SelectionNode[],
  originalSelectionSet: SelectionSetNode | undefined,
  fragments: Map<string, FragmentDefinitionNode>,
): SelectionNode[] {
  if (!originalSelectionSet) {
    return [];
  }
  const providedFieldsByName = new Map<string, Extract<SelectionNode, { kind: 'Field' }>>();
  const otherProvided: SelectionNode[] = [];
  for (const provided of providedSelections) {
    if (provided.kind === Kind.FIELD) {
      providedFieldsByName.set(provided.name.value, provided);
    } else {
      // Inline/fragment spreads in `@provides` are uncommon; if encountered we
      // keep them as-is to match the previous behavior for those edge cases.
      otherProvided.push(provided);
    }
  }
  const result: SelectionNode[] = [];
  collectMatchingOriginalSelections(
    originalSelectionSet,
    providedFieldsByName,
    fragments,
    new Set<string>(),
    new Set<string>(),
    result,
  );
  return [...result, ...otherProvided];
}

function collectMatchingOriginalSelections(
  selectionSet: SelectionSetNode,
  providedFieldsByName: Map<string, Extract<SelectionNode, { kind: 'Field' }>>,
  fragments: Map<string, FragmentDefinitionNode>,
  seenFieldNames: Set<string>,
  seenFragmentNames: Set<string>,
  result: SelectionNode[],
): void {
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      const provided = providedFieldsByName.get(sel.name.value);
      if (!provided) {
        continue;
      }
      const dedupKey = sel.alias?.value ?? sel.name.value;
      if (seenFieldNames.has(dedupKey)) {
        continue;
      }
      seenFieldNames.add(dedupKey);
      if (provided.selectionSet && sel.selectionSet) {
        const nested = intersectProvidedSelections(
          provided.selectionSet.selections,
          sel.selectionSet,
          fragments,
        );
        if (!nested.length) {
          continue;
        }
        result.push({
          ...sel,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: nested,
          },
        });
      } else {
        // Re-add the user's original field (with alias and arguments) so the
        // subgraph response can be merged back into the gateway response.
        result.push(sel);
      }
    } else if (sel.kind === Kind.INLINE_FRAGMENT && sel.selectionSet) {
      // Wrappers that carry conditional directives (`@include` / `@skip`) or a
      // type condition that narrows the parent type must be preserved so that
      // the providing subgraph can still honor the client's conditions.
      const hasDirectives = (sel.directives?.length ?? 0) > 0;
      const hasTypeCondition = sel.typeCondition != null;
      if (hasDirectives || hasTypeCondition) {
        const inner: SelectionNode[] = [];
        collectMatchingOriginalSelections(
          sel.selectionSet,
          providedFieldsByName,
          fragments,
          new Set<string>(),
          new Set<string>(),
          inner,
        );
        if (inner.length === 0) {
          continue;
        }
        result.push({
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: sel.typeCondition,
          directives: sel.directives,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: inner,
          },
        });
      } else {
        // Untyped, undirected inline fragment - safe to flatten into the
        // surrounding selection set so dedup still applies.
        collectMatchingOriginalSelections(
          sel.selectionSet,
          providedFieldsByName,
          fragments,
          seenFieldNames,
          seenFragmentNames,
          result,
        );
      }
    } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const fragmentDef = fragments.get(sel.name.value);
      if (!fragmentDef) {
        continue;
      }
      const hasSpreadDirectives = (sel.directives?.length ?? 0) > 0;
      const hasFragmentDirectives = (fragmentDef.directives?.length ?? 0) > 0;
      if (hasSpreadDirectives || hasFragmentDirectives) {
        // Preserve the spread (rewritten as an inline fragment) so its
        // directives - or the fragment definition's directives - continue to
        // gate the injected selections.
        const inner: SelectionNode[] = [];
        collectMatchingOriginalSelections(
          fragmentDef.selectionSet,
          providedFieldsByName,
          fragments,
          new Set<string>(),
          new Set<string>(),
          inner,
        );
        if (inner.length === 0) {
          continue;
        }
        const combinedDirectives = [...(sel.directives ?? []), ...(fragmentDef.directives ?? [])];
        result.push({
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: fragmentDef.typeCondition,
          directives: combinedDirectives.length > 0 ? combinedDirectives : undefined,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: inner,
          },
        });
      } else {
        // Always retain the fragment's type condition as an inline fragment so
        // provided fields are requested only on the applicable concrete type,
        // even when the spread carries no directives.
        if (seenFragmentNames.has(sel.name.value)) {
          continue;
        }
        seenFragmentNames.add(sel.name.value);
        const inner: SelectionNode[] = [];
        collectMatchingOriginalSelections(
          fragmentDef.selectionSet,
          providedFieldsByName,
          fragments,
          new Set<string>(),
          new Set<string>(),
          inner,
        );
        if (inner.length === 0) {
          continue;
        }
        result.push({
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: fragmentDef.typeCondition,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: inner,
          },
        });
      }
    }
  }
}

function filterTypenameFields(selections: readonly SelectionNode[]): {
  hasTypeNameField: boolean;
  selections: SelectionNode[];
} {
  let hasTypeNameField = false;
  const filteredSelections = selections.filter(selection => {
    if (isTypeNameField(selection)) {
      hasTypeNameField = true;
      return false;
    }
    return true;
  });
  return {
    hasTypeNameField,
    selections: filteredSelections,
  };
}

function collectFragmentVariables(
  targetSchema: GraphQLSchema,
  fragmentSet: any,
  validFragments: Array<FragmentDefinitionNode>,
  validFragmentsWithType: { [name: string]: GraphQLType },
  usedFragments: Array<string>,
  onOverlappingAliases: () => void,
  delegationContext: DelegationContext<any>,
) {
  let remainingFragments = usedFragments.slice();

  let usedVariables: Array<string> = [];
  const newFragments: Array<FragmentDefinitionNode> = [];

  while (remainingFragments.length !== 0) {
    const nextFragmentName = remainingFragments.pop();
    const fragment = validFragments.find(fr => fr.name.value === nextFragmentName);
    if (fragment != null) {
      const name = nextFragmentName;
      const typeName = fragment.typeCondition.name.value;
      const type = targetSchema.getType(typeName);
      if (type == null) {
        throw new Error(
          `Fragment reference type "${typeName}", but the type is not contained within the target schema.`,
        );
      }
      const {
        selectionSet,
        usedFragments: fragmentUsedFragments,
        usedVariables: fragmentUsedVariables,
      } = finalizeSelectionSet(
        targetSchema,
        type,
        validFragmentsWithType,
        fragment.selectionSet,
        onOverlappingAliases,
        delegationContext,
        validFragments,
      );
      remainingFragments = union(remainingFragments, fragmentUsedFragments);
      usedVariables = union(usedVariables, fragmentUsedVariables);

      if (name && !(name in fragmentSet)) {
        fragmentSet[name] = true;
        // skip fragments that were fully filtered away (e.g. all fields are
        // @external in the target subgraph). fragment spreads referencing them
        // will be stripped from the document in a subsequent pass.
        if (selectionSet.selections.length > 0) {
          newFragments.push({
            kind: Kind.FRAGMENT_DEFINITION,
            name: {
              kind: Kind.NAME,
              value: name,
            },
            typeCondition: fragment.typeCondition,
            selectionSet,
          });
        }
      }
    }
  }

  return {
    usedVariables,
    newFragments,
    fragmentSet,
  };
}

const filteredSelectionSetVisitorKeys: ASTVisitorKeyMap = {
  SelectionSet: ['selections'],
  Field: ['selectionSet'],
  InlineFragment: ['selectionSet'],
  FragmentDefinition: ['selectionSet'],
};

const variablesVisitorKeys: ASTVisitorKeyMap = {
  SelectionSet: ['selections'],
  Field: ['arguments', 'directives', 'selectionSet'],
  Argument: ['value'],

  InlineFragment: ['directives', 'selectionSet'],
  FragmentSpread: ['directives'],
  FragmentDefinition: ['selectionSet'],

  ObjectValue: ['fields'],
  ObjectField: ['name', 'value'],
  Directive: ['arguments'],
  ListValue: ['values'],
};

function finalizeSelectionSet(
  schema: GraphQLSchema,
  type: GraphQLType,
  validFragments: { [name: string]: GraphQLType },
  selectionSet: SelectionSetNode,
  onOverlappingAliases: () => void,
  delegationContext: DelegationContext<any>,
  fragmentDefinitions?: ReadonlyArray<FragmentDefinitionNode>,
) {
  const usedFragments: Array<string> = [];
  const usedVariables: Array<string> = [];

  const typeInfo = getTypeInfoWithType(schema, type);
  const seenNonNullableMap = new WeakMap<readonly ASTNode[], Set<string>>();
  const seenNullableMap = new WeakMap<readonly ASTNode[], Set<string>>();

  const filteredSelectionSet = filterSelectionSet(
    schema,
    typeInfo,
    validFragments,
    selectionSet,
    onOverlappingAliases,
    usedFragments,
    seenNonNullableMap,
    seenNullableMap,
    delegationContext,
    fragmentDefinitions,
  );

  visit(
    filteredSelectionSet,
    {
      [Kind.VARIABLE]: variableNode => {
        usedVariables.push(variableNode.name.value);
      },
    },
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    variablesVisitorKeys as any,
  );

  return {
    selectionSet: filteredSelectionSet,
    usedFragments,
    usedVariables,
  };
}

function filterSelectionSet(
  schema: GraphQLSchema,
  typeInfo: TypeInfo,
  validFragments: { [name: string]: GraphQLType },
  selectionSet: SelectionSetNode,
  onOverlappingAliases: () => void,
  usedFragments: Array<string>,
  seenNonNullableMap: WeakMap<readonly ASTNode[], Set<string>>,
  seenNullableMap: WeakMap<readonly ASTNode[], Set<string>>,
  delegationContext: DelegationContext<any>,
  fragmentDefinitions?: ReadonlyArray<FragmentDefinitionNode>,
) {
  // Deferred inline fragments are rewritten on leave. Their child fields that
  // are absent from this subschema are stripped during the field enter visit,
  // so we snapshot @requires / key dependencies on enter (from the original
  // selection set) before those children disappear. Use a stack because leave
  // may receive a replaced node object after child edits.
  const deferredDependencyStack: Array<SelectionNode[] | null> = [];
  // Cached once - visited once per selection node otherwise.
  const forwardDefer = shouldForwardDefer(delegationContext);
  const variableValues = getCoercedVariableValues(delegationContext.info?.variableValues) ?? {};
  const fragmentDefsByName: Record<string, FragmentDefinitionNode> = Object.create(null);
  if (fragmentDefinitions) {
    for (const frag of fragmentDefinitions) {
      fragmentDefsByName[frag.name.value] = frag;
    }
  }

  return visit(
    selectionSet,
    visitWithTypeInfo(typeInfo, {
      [Kind.FIELD]: {
        enter: node => {
          const parentType = typeInfo.getParentType();
          const field = typeInfo.getFieldDef();
          if (
            delegationContext.context != null &&
            delegationContext.info != null &&
            parentType != null &&
            field != null
          ) {
            const parentTypeName = parentType.name;
            const overrideHandler =
              delegationContext.subschemaConfig?.merge?.[parentTypeName]?.fields?.[field.name]
                ?.override;
            if (overrideHandler != null) {
              const overridden = handleOverrideByDelegation(
                delegationContext.info,
                delegationContext.context,
                overrideHandler,
              );
              if (!overridden) {
                return null;
              }
            }
          }
          if (isObjectType(parentType) || isInterfaceType(parentType)) {
            if (!field) {
              return null;
            }

            const args = field.args != null ? field.args : [];
            const argsMap = Object.create(null);
            for (const arg of args) {
              argsMap[arg.name] = arg;
            }
            if (node.arguments != null) {
              const newArgs = [];
              for (const arg of node.arguments) {
                if (arg.name.value in argsMap) {
                  newArgs.push(arg);
                }
              }
              if (newArgs.length !== node.arguments.length) {
                return {
                  ...node,
                  arguments: newArgs,
                };
              }
            }
          }
          if (isUnionType(parentType) && typeInfo.getType() == null) {
            const possibleTypeNames: Array<string> = [];
            const fieldName = node.name.value;
            for (const memberType of parentType.getTypes()) {
              const memberFields = memberType.getFields();
              const possibleField = memberFields[fieldName];
              if (possibleField != null) {
                const namedType = getNamedType(possibleField.type);
                // If the field is a leaf type, it cannot have a selection set
                if (node.selectionSet?.selections?.length && isLeafType(namedType)) {
                  continue;
                }
                // If the field is a composite type, it must have a selection set
                if (!node.selectionSet?.selections?.length && isCompositeType(namedType)) {
                  continue;
                }
                possibleTypeNames.push(memberType.name);
              }
            }
            if (possibleTypeNames.length > 0) {
              const spreads = possibleTypeNames.map(possibleTypeName => {
                if (!node.selectionSet?.selections) {
                  // leaf field, no selection set. return as is we're sure it exists
                  return {
                    kind: Kind.INLINE_FRAGMENT,
                    typeCondition: {
                      kind: Kind.NAMED_TYPE,
                      name: {
                        kind: Kind.NAME,
                        value: possibleTypeName,
                      },
                    },
                    selectionSet: {
                      kind: Kind.SELECTION_SET,
                      selections: [node],
                    },
                  };
                }

                // object field with selection set. filter it recursively
                const possibleType = schema.getType(possibleTypeName) as GraphQLObjectType; // it's an object type because union members must be objects

                const possibleField = possibleType.getFields()[node.name.value];
                if (!possibleField) {
                  // the field does not exist on the possible type, skip the spread altogether
                  return undefined;
                }

                // recursively filter the selection set because abstract types can be nested
                const fieldFilteredSelectionSet = filterSelectionSet(
                  schema,
                  getTypeInfoWithType(schema, possibleField.type),
                  validFragments,
                  node.selectionSet,
                  onOverlappingAliases,
                  usedFragments,
                  seenNonNullableMap,
                  seenNullableMap,
                  delegationContext,
                  fragmentDefinitions,
                );

                if (!fieldFilteredSelectionSet.selections.length) {
                  // no selections remain after filtering the field, skip the spread altogether
                  return undefined;
                }

                return {
                  kind: Kind.INLINE_FRAGMENT,
                  typeCondition: {
                    kind: Kind.NAMED_TYPE,
                    name: {
                      kind: Kind.NAME,
                      value: possibleTypeName,
                    },
                  },
                  selectionSet: {
                    kind: Kind.SELECTION_SET,
                    selections: [
                      {
                        ...node,
                        selectionSet: fieldFilteredSelectionSet,
                      },
                    ],
                  },
                };
              });
              const nonEmptySpreads = spreads.filter(
                spread => spread != null,
              ) as Array<InlineFragmentNode>;
              if (!nonEmptySpreads.length) {
                // no spreads remain after filtering, skip the field altogether.
                // this is important to avoid invalid ast nodes causing empty lines
                // in the resulting query
                return undefined;
              }
              // graphql-js `visit` replaces a list element with the returned
              // value as-is — it does NOT splice arrays. Returning one node is
              // fine; multiple spreads are returned as an array and flattened
              // in SELECTION_SET.leave below (needed for union key fields like
              // `id` under StubMajor — graphql-tools#4965).
              if (nonEmptySpreads.length === 1) {
                return nonEmptySpreads[0];
              }
              return nonEmptySpreads;
            }
          }
          return undefined;
        },
        leave: node => {
          const type = typeInfo.getType();
          if (type == null) {
            return null;
          }
          const namedType = getNamedType(type);
          if (schema.getType(namedType.name) == null) {
            return null;
          }

          if (isObjectType(namedType) || isInterfaceType(namedType)) {
            const selections = node.selectionSet != null ? node.selectionSet.selections : null;
            if (selections == null || selections.length === 0) {
              return null;
            }
          }

          // Gateway-owned nested @stream: strip so the subgraph returns the
          // full list and graphql-js streams locally. Root-field @stream is
          // kept so delegateToSchema's list AsyncIterable path can flush
          // early (same split as @defer omit vs forward).
          // Original graphql-tools#1941 covered nested proxied @stream this way.
          if (
            !forwardDefer &&
            hasStreamDirective(node.directives) &&
            !isOperationRootType(typeInfo.getParentType(), schema)
          ) {
            return {
              ...node,
              directives: node.directives?.filter(directive => directive.name.value !== 'stream'),
            };
          }
          return undefined;
        },
      },
      [Kind.FRAGMENT_SPREAD]: {
        enter: node => {
          // Gateway-owned @defer on a named spread: keep only @requires / key
          // dependencies from the fragment body (same as deferred inline
          // fragments), so merge still has the keys it needs.
          if (hasDeferDirective(node.directives, variableValues) && !forwardDefer) {
            const frag = fragmentDefsByName[node.name.value];
            if (!frag?.selectionSet?.selections?.length) {
              // Balance the stack: leave on the replacement (or null) path is
              // not taken; push nothing. Returning null does not create an
              // INLINE_FRAGMENT leave — no push needed.
              return null;
            }
            const dependencyParentType =
              schema.getType(frag.typeCondition.name.value) ?? typeInfo.getParentType();
            const dependencySelections = collectDeferredDependencySelections(
              frag.selectionSet.selections,
              dependencyParentType,
              delegationContext,
            );
            if (dependencySelections.length === 0) {
              return null;
            }
            // Push a null placeholder so INLINE_FRAGMENT.leave for the
            // replacement consumes it instead of an enclosing snapshot.
            deferredDependencyStack.push(null);
            return {
              kind: Kind.INLINE_FRAGMENT,
              typeCondition: frag.typeCondition,
              selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: dependencySelections,
              },
            };
          }
          if (!(node.name.value in validFragments)) {
            return null;
          }
          const parentType = typeInfo.getParentType();
          const innerType = validFragments[node.name.value];
          if (!implementsAbstractType(schema, parentType, innerType)) {
            return null;
          }

          usedFragments.push(node.name.value);
          return undefined;
        },
      },
      [Kind.SELECTION_SET]: {
        enter: (node, _key, _parent, _path) => {
          const parentType = typeInfo.getParentType();
          const { hasTypeNameField, selections } = filterTypenameFields(node.selections);
          if (hasTypeNameField || (parentType != null && isAbstractType(parentType))) {
            selections.unshift({
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: '__typename',
              },
            });
          }
          return {
            ...node,
            selections,
          };
        },
        leave: node => {
          // Flatten spreads returned as arrays from FIELD.enter when a bare
          // field on a union is expanded into per-member inline fragments.
          // Without this, `visit` nests the array as a single selection and
          // the fragment is ignored at execution time.
          if (node.selections.some(selection => Array.isArray(selection))) {
            return {
              ...node,
              selections: node.selections.flat().filter(Boolean),
            };
          }
          return undefined;
        },
      },
      [Kind.INLINE_FRAGMENT]: {
        enter: node => {
          if (node.typeCondition != null) {
            const parentType = typeInfo.getParentType();
            const innerType = schema.getType(node.typeCondition.name.value);
            if (
              isUnionType(parentType) &&
              parentType.getTypes().some(t => t.name === innerType?.name)
            ) {
              // fall through to defer snapshot below
            } else if (!implementsAbstractType(schema, parentType, innerType)) {
              return null;
            }
          }
          if (
            !forwardDefer &&
            hasDeferDirective(node.directives, variableValues) &&
            node.selectionSet?.selections
          ) {
            // Snapshot before child fields absent from this schema are stripped
            const dependencyParentType =
              (node.typeCondition != null
                ? schema.getType(node.typeCondition.name.value)
                : typeInfo.getParentType()) ?? typeInfo.getParentType();
            deferredDependencyStack.push(
              collectDeferredDependencySelections(
                node.selectionSet.selections,
                dependencyParentType,
                delegationContext,
              ),
            );
          } else {
            deferredDependencyStack.push(null);
          }
          return undefined;
        },
        leave: (selection, _key, parent) => {
          const snappedDependencies = deferredDependencyStack.pop() ?? null;
          // Disabled @defer(if: false): strip the directive but keep selections.
          if (hasDisabledDeferDirective(selection.directives, variableValues)) {
            return {
              ...selection,
              directives: selection.directives?.filter?.(
                directive => directive.name.value !== 'defer',
              ),
            };
          }
          // When the subschema opts into `defer: true`, keep `@defer` and let
          // the subgraph stream patches. Otherwise `@defer` is gateway-owned:
          // omit deferred selections (keeping only @requires/key deps) so the
          // initial payload can flush before slow deferred fields resolve.
          if (hasDeferDirective(selection.directives, variableValues) && !forwardDefer) {
            const dependencySelections = snappedDependencies ?? [];
            if (dependencySelections.length === 0) {
              return null;
            }
            return {
              ...selection,
              directives: selection.directives?.filter?.(
                directive => directive.name.value !== 'defer',
              ),
              selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: dependencySelections,
              },
            };
          }
          if (!selection.selectionSet?.selections?.length) {
            return null;
          }
          if (Array.isArray(parent)) {
            const selectionTypeName = selection.typeCondition?.name.value;
            if (selectionTypeName) {
              const selectionType = schema.getType(selectionTypeName);
              if (selectionType && 'getFields' in selectionType) {
                const selectionTypeFields = selectionType.getFields();
                let seenNonNullable = seenNonNullableMap.get(parent);
                if (!seenNonNullable) {
                  seenNonNullable = new Set();
                  seenNonNullableMap.set(parent, seenNonNullable);
                }
                let seenNullable = seenNullableMap.get(parent);
                if (!seenNullable) {
                  seenNullable = new Set();
                  seenNullableMap.set(parent, seenNullable);
                }
                selection = {
                  ...selection,
                  selectionSet: {
                    ...selection.selectionSet,
                    selections: selection.selectionSet.selections.map(subSelection => {
                      if (subSelection.kind === Kind.FIELD) {
                        const fieldName = subSelection.name.value;
                        if (!subSelection.alias) {
                          const field = selectionTypeFields[fieldName];
                          if (field) {
                            let currentNullable: boolean;
                            if (isNullableType(field.type)) {
                              seenNullable.add(fieldName);
                              currentNullable = true;
                            } else {
                              seenNonNullable.add(fieldName);
                              currentNullable = false;
                            }
                            if (seenNullable.has(fieldName) && seenNonNullable.has(fieldName)) {
                              onOverlappingAliases();
                              return {
                                ...subSelection,
                                alias: {
                                  kind: Kind.NAME,
                                  value: currentNullable
                                    ? `_nullable_${fieldName}`
                                    : `_nonNullable_${fieldName}`,
                                },
                              };
                            }
                          }
                        }
                      }
                      return subSelection;
                    }),
                  },
                };
              }
            }
          }
          // No need __typename in inline fragment
          const { selections } = filterTypenameFields(selection.selectionSet.selections);
          if (selections.length === 0) {
            return null;
          }
          return {
            ...selection,
            selectionSet: {
              ...selection.selectionSet,
              selections,
            },
          };
        },
      },
    }),
    // visitorKeys argument usage a la https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js
    // empty keys cannot be removed only because of typescript errors
    // will hopefully be fixed in future version of graphql-js to be optional
    filteredSelectionSetVisitorKeys as any,
  );
}

/**
 * True when an active `@defer` is present (`if` omitted, true, or a variable
 * that is not explicitly false). `@defer(if: false)` is not deferred.
 */
function hasDeferDirective(
  directives: ReadonlyArray<DirectiveNode> | undefined,
  variableValues: Record<string, unknown> = {},
): boolean {
  if (directives == null) {
    return false;
  }
  for (let i = 0; i < directives.length; i++) {
    const directive = directives[i]!;
    if (directive.name.value !== 'defer') {
      continue;
    }
    return evaluateDeferIfArgument(directive, variableValues);
  }
  return false;
}

/** True when `@defer(if: false)` (literal or variable) is present. */
function hasDisabledDeferDirective(
  directives: ReadonlyArray<DirectiveNode> | undefined,
  variableValues: Record<string, unknown> = {},
): boolean {
  if (directives == null) {
    return false;
  }
  for (let i = 0; i < directives.length; i++) {
    const directive = directives[i]!;
    if (directive.name.value !== 'defer') {
      continue;
    }
    return !evaluateDeferIfArgument(directive, variableValues);
  }
  return false;
}

function evaluateDeferIfArgument(
  directive: DirectiveNode,
  variableValues: Record<string, unknown>,
): boolean {
  const ifArg = directive.arguments?.find(arg => arg.name.value === 'if');
  if (ifArg == null) {
    return true;
  }
  const valueNode = ifArg.value;
  if (valueNode.kind === Kind.BOOLEAN) {
    return valueNode.value;
  }
  if (valueNode.kind === Kind.VARIABLE) {
    const name = valueNode.name.value;
    if (!Object.prototype.hasOwnProperty.call(variableValues, name)) {
      // Missing variable: GraphQL default for @defer(if:) is true.
      return true;
    }
    return variableValues[name] !== false;
  }
  return true;
}

function hasStreamDirective(directives: ReadonlyArray<DirectiveNode> | undefined): boolean {
  if (directives == null) {
    return false;
  }
  for (let i = 0; i < directives.length; i++) {
    if (directives[i]!.name.value === 'stream') {
      return true;
    }
  }
  return false;
}

function isOperationRootType(
  parentType: GraphQLNamedType | null | undefined,
  schema: GraphQLSchema,
): boolean {
  if (parentType == null) {
    return false;
  }
  return (
    parentType === schema.getQueryType() ||
    parentType === schema.getMutationType() ||
    parentType === schema.getSubscriptionType()
  );
}

function shouldForwardDefer(delegationContext: DelegationContext<any>): boolean {
  const config = delegationContext.subschemaConfig as { defer?: boolean } | undefined;
  return config?.defer === true;
}

/**
 * From a deferred selection set, keep only the fields this subschema must
 * resolve immediately as dependencies of deferred fields that will be merged
 * later (typically `@requires` / key fields from `fieldSelectionSets`).
 * Deferred fields that this subschema itself owns are dropped so they can
 * resolve incrementally on the gateway.
 */
function collectDeferredDependencySelections(
  selections: readonly SelectionNode[],
  parentType: GraphQLNamedType | null | undefined,
  delegationContext: DelegationContext<any>,
): SelectionNode[] {
  if (!parentType || !('getFields' in parentType)) {
    return [];
  }
  const stitchingInfo = delegationContext.info?.schema.extensions?.stitchingInfo as
    StitchingInfo | undefined;
  const typeConfig = stitchingInfo?.mergedTypes?.[parentType.name];
  const parentFields = (parentType as GraphQLObjectType).getFields();

  const dependencies: SelectionNode[] = [];
  const seen = new Set<string>();

  function addDependencyField(field: Extract<SelectionNode, { kind: 'Field' }>) {
    const fieldName = field.name.value;
    if (parentFields[fieldName] == null) {
      return;
    }
    const existingIndex = dependencies.findIndex(
      d => d.kind === Kind.FIELD && d.name.value === fieldName && !d.alias,
    );
    if (existingIndex >= 0) {
      const existing = dependencies[existingIndex] as Extract<SelectionNode, { kind: 'Field' }>;
      // Merge nested selection sets (e.g. dimensions { width }) onto the kept field.
      if (field.selectionSet?.selections?.length) {
        const mergedSelections = [
          ...(existing.selectionSet?.selections ?? []),
          ...field.selectionSet.selections,
        ];
        dependencies[existingIndex] = {
          ...existing,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: mergedSelections,
          },
        };
      }
      return;
    }
    if (seen.has(fieldName) && !field.selectionSet) {
      return;
    }
    seen.add(fieldName);
    // Retain full field AST including nested selection sets; scalars stay bare.
    dependencies.push({
      kind: Kind.FIELD,
      name: field.name,
      alias: field.alias,
      arguments: field.arguments,
      directives: field.directives,
      selectionSet: field.selectionSet,
    });
  }

  function addDependenciesForMergedField(fieldName: string) {
    // fieldSelectionSets: for each subschema that owns `fieldName`, the
    // selection set of sibling fields that must already be on the parent
    // (e.g. @requires). Those siblings often live on *this* subschema.
    if (typeConfig?.fieldSelectionSets) {
      for (const fieldMap of typeConfig.fieldSelectionSets.values()) {
        const requiredSelectionSet = fieldMap?.[fieldName];
        if (!requiredSelectionSet?.selections) {
          continue;
        }
        for (const requiredSelection of requiredSelectionSet.selections) {
          if (requiredSelection.kind === Kind.FIELD) {
            addDependencyField(requiredSelection);
          }
        }
      }
    }
    // Also honour @provides-style dependency maps when present.
    const provided = typeConfig?.providedSelectionsByField?.get(
      delegationContext.subschema as Subschema,
    )?.[fieldName];
    if (provided?.selections) {
      for (const providedSelection of provided.selections) {
        if (providedSelection.kind === Kind.FIELD) {
          addDependencyField(providedSelection);
        }
      }
    }
  }

  function walk(nodes: readonly SelectionNode[]) {
    for (const node of nodes) {
      if (node.kind === Kind.FIELD) {
        const fieldName = node.name.value;
        const fieldOnSubschema = parentFields[fieldName] != null;
        if (!fieldOnSubschema) {
          // Deferred field lives on another subschema - pull in the
          // @requires / key fields this subschema must supply first.
          addDependenciesForMergedField(fieldName);
        }
        // If the field is on this subschema, drop it so @defer can flush
        // before local resolution (gateway-owned incremental delivery).
      } else if (node.kind === Kind.INLINE_FRAGMENT && node.selectionSet) {
        walk(node.selectionSet.selections);
      } else if (node.kind === Kind.FRAGMENT_SPREAD) {
        // Nested named spreads inside a deferred selection must contribute
        // the same @requires / key dependencies as inline fragments.
        const fragDef = delegationContext.info?.fragments?.[node.name.value];
        if (fragDef?.selectionSet?.selections) {
          walk(fragDef.selectionSet.selections);
        }
      }
    }
  }

  walk(selections);
  return dependencies;
}

function union(...arrays: Array<Array<string>>): Array<string> {
  const cache: Record<string, boolean> = Object.create(null);
  const result: Array<string> = [];
  for (const array of arrays) {
    for (const item of array) {
      if (!(item in cache)) {
        cache[item] = true;
        result.push(item);
      }
    }
  }
  return result;
}
