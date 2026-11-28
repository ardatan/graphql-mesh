import {
  getArgumentValues,
  getNamedType,
  GraphQLError,
  isInterfaceType,
  isNullableType,
  isObjectType,
  Kind,
  OperationTypeNode,
  visit,
  type DocumentNode,
  type FieldNode,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLSchema,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import {
  createDefaultExecutor,
  delegateToSchema,
  FIELD_SUBSCHEMA_MAP_SYMBOL,
  mergeFields,
  OBJECT_SUBSCHEMA_SYMBOL,
  UNPATHED_ERRORS_SYMBOL,
  type StitchingInfo,
  type Subschema,
} from '@graphql-tools/delegate';
// Annotation uses Symbol keys (JSON-invisible) via direct assign - cheaper than
// annotateExternalObject's Object.defineProperties on large entity lists.
import { CRITICAL_ERROR, getFragmentsFromDocument } from '@graphql-tools/executor';
import {
  getDefinedRootType,
  getOperationASTFromRequest,
  mergeDeep,
  relocatedError,
  type ExecutionRequest,
  type ExecutionResult,
} from '@graphql-tools/utils';
import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import { asGetArgumentValuesVariables } from '../variableValues.js';
import { getBatchedMergeEntry } from './mergeEntry.js';
import {
  buildPlanSchedule,
  collectExecutableHops,
  freshWaits,
  type ScheduledHop,
} from './planSchedule.js';
import { BACKBONE_EXECUTING, getOriginalRootResolve } from './rootProxyingResolvers.js';
import { ensureVariableValue, evaluateRunIf } from './runIf.js';
import type {
  BackboneExecutionContext,
  PathSegment,
  StitchPlan,
  StitchPlanNode,
  StitchPlanSchedule,
} from './types.js';

/** Same key as stitchSchemas wrap - skip classic mergeFields after plan hop. */
const BACKBONE_HYDRATED = Symbol.for('graphql-tools.stitch.backboneHydrated');

/**
 * Cached shape of an entity selection for reuse checks. Leaf-only hops use the
 * cheap key loop (pre-1d597494); nested/fragment selections pay the deep walk
 * only after a top-level key precheck passes.
 */
type ReuseSelectionInfo = {
  leafOnly: boolean;
  /** Top-level response keys (excl. __typename); deep nests still listed. */
  topKeys: string[];
};

const reuseSelectionInfoCache = new WeakMap<SelectionSetNode, ReuseSelectionInfo>();

function getReuseSelectionInfo(selectionSet: SelectionSetNode): ReuseSelectionInfo {
  const cached = reuseSelectionInfoCache.get(selectionSet);
  if (cached) {
    return cached;
  }
  let leafOnly = true;
  const topKeys: string[] = [];
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      if (sel.name.value === '__typename') {
        continue;
      }
      topKeys.push(sel.alias?.value ?? sel.name.value);
      if (sel.selectionSet) {
        leafOnly = false;
      }
    } else {
      // Inline fragments / spreads: not a pure leaf key list.
      leafOnly = false;
    }
  }
  const info: ReuseSelectionInfo = { leafOnly, topKeys };
  reuseSelectionInfoCache.set(selectionSet, info);
  return info;
}

function leafKeysSatisfied(value: Record<string, any>, keys: readonly string[]): boolean {
  if (!keys.length) {
    return false;
  }
  for (const k of keys) {
    if (value[k] === undefined) {
      return false;
    }
  }
  return true;
}

/**
 * Deep walk: nested trees + matching inline fragments. Fragment spreads → false.
 * Callers should prefer {@link selectionSatisfiedBy} which fast-paths leaves.
 */
function selectionSatisfiedByDeep(
  value: Record<string, any>,
  selectionSet: SelectionSetNode,
  schema?: GraphQLSchema,
): boolean {
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      if (sel.name.value === '__typename') {
        continue;
      }
      const key = sel.alias?.value ?? sel.name.value;
      if (value[key] === undefined) {
        return false;
      }
      if (!sel.selectionSet) {
        continue;
      }
      const child = value[key];
      if (child == null) {
        continue; // null is a complete answer for the nested selection
      }
      if (Array.isArray(child)) {
        for (const item of child) {
          if (
            item != null &&
            typeof item === 'object' &&
            !selectionSatisfiedBy(item, sel.selectionSet, schema)
          ) {
            return false;
          }
        }
      } else if (typeof child === 'object') {
        if (!selectionSatisfiedBy(child, sel.selectionSet, schema)) {
          return false;
        }
      } else {
        return false;
      }
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      if (sel.typeCondition) {
        const tn = value.__typename;
        if (tn != null && tn !== sel.typeCondition.name.value) {
          // @interfaceObject parents still carry the interface __typename until
          // a concrete hop runs. Only skip when a *different concrete* object
          // type was already resolved (Admin vs Regular).
          const runtime = schema?.getType(tn);
          if (runtime != null && (isInterfaceType(runtime) || !isObjectType(runtime))) {
            return false;
          }
          continue;
        }
      }
      if (!selectionSatisfiedBy(value, sel.selectionSet, schema)) {
        return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

/**
 * True when `value` already holds every field in `selectionSet`.
 * Leaf-only: O(keys) like pre-nested-reuse. Nested: top-level miss rejects
 * before any deep/list walk (federation TestQuery hot path).
 */
function selectionSatisfiedBy(
  value: Record<string, any> | null | undefined,
  selectionSet: SelectionSetNode,
  schema?: GraphQLSchema,
): boolean {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const info = getReuseSelectionInfo(selectionSet);
  if (info.leafOnly) {
    return leafKeysSatisfied(value, info.topKeys);
  }
  // Nested / fragments: cheap reject when any top-level field is missing.
  if (info.topKeys.length && !leafKeysSatisfied(value, info.topKeys)) {
    return false;
  }
  return selectionSatisfiedByDeep(value, selectionSet, schema);
}

/** Copy missing selection fields (incl. nested) from cached entity onto parent. */
function copySelectionFromCached(
  parent: Record<string, any>,
  cached: Record<string, any>,
  selectionSet: SelectionSetNode,
): void {
  const info = getReuseSelectionInfo(selectionSet);
  if (info.leafOnly) {
    for (const k of info.topKeys) {
      if (parent[k] === undefined && cached[k] !== undefined) {
        parent[k] = cached[k];
      }
    }
    if (cached.__typename != null && parent.__typename == null) {
      parent.__typename = cached.__typename;
    }
    return;
  }
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      if (sel.name.value === '__typename') {
        if (parent.__typename == null && cached.__typename != null) {
          parent.__typename = cached.__typename;
        }
        continue;
      }
      const key = sel.alias?.value ?? sel.name.value;
      if (cached[key] === undefined) {
        continue;
      }
      if (sel.selectionSet) {
        if (parent[key] === undefined) {
          parent[key] = cached[key];
          continue;
        }
        const pv = parent[key];
        const cv = cached[key];
        if (
          pv != null &&
          typeof pv === 'object' &&
          !Array.isArray(pv) &&
          cv != null &&
          typeof cv === 'object' &&
          !Array.isArray(cv)
        ) {
          copySelectionFromCached(pv, cv, sel.selectionSet);
        } else if (Array.isArray(pv) && Array.isArray(cv) && pv.length === cv.length) {
          for (let i = 0; i < pv.length; i++) {
            if (
              pv[i] != null &&
              typeof pv[i] === 'object' &&
              cv[i] != null &&
              typeof cv[i] === 'object'
            ) {
              copySelectionFromCached(pv[i], cv[i], sel.selectionSet);
            } else if (pv[i] === undefined && cv[i] !== undefined) {
              pv[i] = cv[i];
            }
          }
        }
      } else if (parent[key] === undefined) {
        parent[key] = cached[key];
      }
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      if (sel.typeCondition) {
        const tn = parent.__typename ?? cached.__typename;
        if (tn != null && tn !== sel.typeCondition.name.value) {
          continue;
        }
      }
      copySelectionFromCached(parent, cached, sel.selectionSet);
    }
  }
}

/** Entity reuse is always on for queries; mutations and streams hard-skip. */
function entityReuseAllowed(ctx: BackboneExecutionContext): boolean {
  if (ctx.operation.operation === 'mutation') {
    return false;
  }
  // Never copy once the request already has an error (nulls must not be reused).
  if (ctx.errors.length) {
    return false;
  }
  return true;
}

function representationHash(
  parent: Record<string, any>,
  hopSubschema: Subschema,
  entityTypeName: string,
): string | null {
  const sub = hopSubschema.name ?? `anon:${entityTypeName}`;
  const entry = getBatchedMergeEntry(hopSubschema, entityTypeName);
  if (entry) {
    const key = entry.key(parent);
    if (key == null) {
      return null;
    }
    const cacheKeyFn = entry.dataLoaderOptions?.cacheKeyFn;
    const identity = cacheKeyFn != null ? String(cacheKeyFn(key)) : JSON.stringify(key);
    // Scope by subgraph + type + key (entity-reuse representation hash).
    return `${sub}::${entityTypeName}::${identity}`;
  }
  // Classic stitching merge (`args` / selectionSet) — hash the merge args
  // or key fields so same-rep parents share one fetch.
  const mergeConfig = hopSubschema.merge?.[entityTypeName];
  if (!mergeConfig) {
    return null;
  }
  if (typeof mergeConfig.args === 'function') {
    try {
      const args = mergeConfig.args(parent);
      if (args == null) {
        return null;
      }
      return `${sub}::${entityTypeName}::args:${JSON.stringify(args)}`;
    } catch {
      return null;
    }
  }
  if (typeof mergeConfig.key === 'function') {
    const key = mergeConfig.key(parent);
    if (key == null) {
      return null;
    }
    return `${sub}::${entityTypeName}::key:${JSON.stringify(key)}`;
  }
  return null;
}

function rememberEntityForReuse(
  ctx: BackboneExecutionContext,
  hopSubschema: Subschema,
  entityTypeName: string,
  parent: Record<string, any>,
): void {
  if (!entityReuseAllowed(ctx)) {
    return;
  }
  const hash = representationHash(parent, hopSubschema, entityTypeName);
  if (!hash) {
    return;
  }
  if (!ctx.entityByRepHash) {
    ctx.entityByRepHash = new Map();
  }
  // Store a shallow snapshot of current parent fields for later copy.
  ctx.entityByRepHash.set(hash, { ...parent });
}

/**
 * Copy reused fields onto parent when a prior hop already produced the same
 * representation with the needed leaves. Returns true when parent is complete.
 */
function tryReuseEntityIntoParent(
  ctx: BackboneExecutionContext,
  hopSubschema: Subschema,
  entityTypeName: string,
  parent: Record<string, any>,
  selectionSet: SelectionSetNode,
): boolean {
  if (!entityReuseAllowed(ctx) || !ctx.entityByRepHash?.size) {
    // Fall back: parent already has the needed selection from an earlier merge.
    return selectionSatisfiedBy(parent, selectionSet, ctx.schema);
  }
  if (selectionSatisfiedBy(parent, selectionSet, ctx.schema)) {
    return true;
  }
  const hash = representationHash(parent, hopSubschema, entityTypeName);
  if (!hash) {
    return false;
  }
  const cached = ctx.entityByRepHash.get(hash);
  if (!cached || !selectionSatisfiedBy(cached, selectionSet, ctx.schema)) {
    return false;
  }
  // Cached already satisfied the selection — copy is sufficient (no re-walk).
  copySelectionFromCached(parent, cached, selectionSet);
  return true;
}

/**
 * Subgraph executor as configured on the Subschema. Gateway/fusion already
 * wraps with getBatchingExecutor when `batch` is enabled - do not re-wrap.
 */
function getSubschemaExecutor(subschema: Subschema) {
  return subschema.executor ?? createDefaultExecutor(subschema.schema);
}

/**
 * Hive Parallel pattern: only real promises enter `Promise.all`. Sync
 * completions stay sync - never `Promise.resolve` every job (extra microtasks).
 */
function awaitMaybePromises(jobs: ReadonlyArray<MaybePromise<unknown>>): MaybePromise<void> {
  const promises: PromiseLike<unknown>[] = [];
  for (const job of jobs) {
    if (isPromise(job)) {
      promises.push(job);
    }
  }
  if (promises.length === 0) {
    return;
  }
  if (promises.length === 1) {
    return Promise.resolve(promises[0]!).then(() => {
      /* drain */
    });
  }
  return Promise.all(promises).then(() => {
    /* drain */
  });
}

/**
 * Like `awaitMaybePromises` but preserves per-job values. Sync slots are kept
 * as-is; only promise slots are awaited and filled back by index.
 */
function allMaybePromises<T>(jobs: ReadonlyArray<MaybePromise<T>>): MaybePromise<T[]> {
  const results: T[] = new Array(jobs.length);
  const promises: PromiseLike<T>[] = [];
  const indices: number[] = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]!;
    if (isPromise(job)) {
      promises.push(job);
      indices.push(i);
    } else {
      results[i] = job as T;
    }
  }
  if (promises.length === 0) {
    return results;
  }
  return Promise.all(promises).then(resolved => {
    for (let k = 0; k < resolved.length; k++) {
      results[indices[k]!] = resolved[k]!;
    }
    return results;
  });
}

/** Stamp subschema symbols without Object.defineProperties. */
function stampSubschema(
  object: Record<string, any>,
  subschema: Subschema,
  errors?: readonly any[],
): void {
  (object as any)[OBJECT_SUBSCHEMA_SYMBOL] = subschema;
  if ((object as any)[FIELD_SUBSCHEMA_MAP_SYMBOL] == null) {
    // Per-object map: mergeFields writes responseKey -> subschema entries.
    (object as any)[FIELD_SUBSCHEMA_MAP_SYMBOL] = Object.create(null);
  }
  if ((object as any)[UNPATHED_ERRORS_SYMBOL] == null) {
    (object as any)[UNPATHED_ERRORS_SYMBOL] = errors?.length ? [...errors] : [];
  } else if (errors?.length) {
    (object as any)[UNPATHED_ERRORS_SYMBOL] = [...errors];
  }
}

/**
 * Concrete root/list payloads omit planner-injected `__typename` in the outbound
 * query; stamp the known object type so later entity hops can match parents.
 */
function stampConcreteTypename(value: any, returnType: GraphQLOutputType): void {
  const named = getNamedType(returnType);
  if (!isObjectType(named)) {
    return;
  }
  if (value == null) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      stampConcreteTypename(item, named);
    }
    return;
  }
  if (typeof value === 'object' && value.__typename == null) {
    value.__typename = named.name;
  }
}

/**
 * Locate subgraph / plugin errors onto the gateway root field path (classic
 * checkResultAndHandleErrors parity). Preserve plugin extensions (COST_*).
 */
function locateRootFieldErrors(
  errors: readonly GraphQLError[],
  responseKey: string,
  _fieldNode: FieldNode,
): GraphQLError[] {
  return errors.map(error => {
    if (error.path?.length) {
      if (error.path[0] === responseKey) {
        return error;
      }
      return relocatedError(error, [responseKey, ...error.path]);
    }
    // Preserve original nodes/locations (often absent for transport errors);
    // only attach the gateway path - classic checkResultAndHandleErrors parity.
    return new GraphQLError(error.message, {
      originalError: error,
      nodes: error.nodes,
      source: error.source,
      positions: error.positions,
      path: [responseKey],
      extensions: error.extensions,
    });
  });
}

function isGraphQLErrorLike(err: unknown): err is GraphQLError {
  return (
    err instanceof GraphQLError ||
    (typeof err === 'object' &&
      err != null &&
      typeof (err as { message?: unknown }).message === 'string' &&
      'extensions' in err)
  );
}

/**
 * Preserve GraphQLError extensions from onSubgraphExecute plugins (demand
 * control COST_*). Only synthesize DOWNSTREAM_SERVICE_ERROR for unknown throws.
 */
function errorFromFetchThrow(
  err: unknown,
  subschema: Subschema,
  responseKey: string,
  fieldNode?: FieldNode,
): GraphQLError {
  if (err instanceof GraphQLError || isGraphQLErrorLike(err)) {
    const gqlErr = err as GraphQLError;
    return new GraphQLError(gqlErr.message, {
      originalError: gqlErr instanceof Error ? gqlErr : undefined,
      nodes: gqlErr.nodes?.length ? gqlErr.nodes : fieldNode ? [fieldNode] : undefined,
      source: gqlErr.source,
      positions: gqlErr.positions,
      path: gqlErr.path?.length ? gqlErr.path : [responseKey],
      extensions: gqlErr.extensions,
    });
  }
  return new GraphQLError(err instanceof Error ? err.message : String(err), {
    originalError: err instanceof Error ? err : undefined,
    nodes: fieldNode ? [fieldNode] : undefined,
    path: [responseKey],
    extensions: {
      code: 'DOWNSTREAM_SERVICE_ERROR',
      serviceName: subschema.name,
    },
  });
}

/**
 * Mutation serial parity: after a root completed as null, skip later hops when
 * the root field is non-null (Fetch + root Island). Includes completed null
 * without downstream errors (nullable subgraph field under NonNull gateway).
 * Missing keys (root not written yet) must not abort.
 */
function maybeAbortMutationAfterNullifiedRoot(
  ctx: BackboneExecutionContext,
  responseKey: string,
  fieldName: string,
): void {
  if (ctx.operation.operation !== 'mutation') {
    return;
  }
  // Present-and-null only. `key in data` distinguishes completed null from
  // an unwritten root (undefined), which must not stop later mutation roots.
  if (!(responseKey in ctx.data) || ctx.data[responseKey] != null) {
    return;
  }
  const rootType = getDefinedRootType(ctx.schema, ctx.operation.operation);
  const fieldDef = rootType.getFields()[fieldName];
  if (fieldDef && !isNullableType(fieldDef.type)) {
    ctx.abortRemainingHops = true;
  }
}

/** Local Island resolver throw → GraphQLError on the field path (no serviceName). */
function errorFromIslandThrow(
  err: unknown,
  responseKey: string,
  fieldNode?: FieldNode,
): GraphQLError {
  if (err instanceof GraphQLError || isGraphQLErrorLike(err)) {
    const gqlErr = err as GraphQLError;
    return new GraphQLError(gqlErr.message, {
      originalError: gqlErr instanceof Error ? gqlErr : undefined,
      nodes: gqlErr.nodes?.length ? gqlErr.nodes : fieldNode ? [fieldNode] : undefined,
      source: gqlErr.source,
      positions: gqlErr.positions,
      path: gqlErr.path?.length ? gqlErr.path : [responseKey],
      extensions: gqlErr.extensions,
    });
  }
  return new GraphQLError(err instanceof Error ? err.message : String(err), {
    originalError: err instanceof Error ? err : undefined,
    nodes: fieldNode ? [fieldNode] : undefined,
    path: [responseKey],
  });
}

/** After plan execute: fill missing nullable roots with null; bubble non-null. */
function finalizeRootResult(ctx: BackboneExecutionContext): ExecutionResult {
  const rootType = getDefinedRootType(ctx.schema, ctx.operation.operation);
  const data: Record<string, any> = { ...ctx.data };
  let nullWhole = false;

  for (const sel of ctx.operation.selectionSet.selections) {
    if (sel.kind !== Kind.FIELD) {
      continue;
    }
    const fieldName = sel.name.value;
    if (fieldName.startsWith('__')) {
      continue;
    }
    const field = rootType.getFields()[fieldName];
    if (!field) {
      continue;
    }
    const responseKey = sel.alias?.value ?? fieldName;
    const hasFieldError = ctx.errors.some(e => {
      const path = (e as GraphQLError).path;
      return !path?.length || path[0] === responseKey;
    });
    const missing = !(responseKey in data) || data[responseKey] === undefined;
    if (missing && hasFieldError) {
      if (!isNullableType(field.type)) {
        nullWhole = true;
      } else {
        data[responseKey] = null;
      }
    } else if (data[responseKey] === null && !isNullableType(field.type)) {
      nullWhole = true;
    }
  }

  const result: ExecutionResult = {};
  if (nullWhole) {
    result.data = null;
  } else if (Object.keys(data).length) {
    result.data = data;
  } else if (!ctx.errors.length) {
    // All root fields skipped via @skip/@include Condition - graphql-js
    // still returns an empty data object.
    result.data = {};
  }
  if (ctx.errors.length) {
    // CRITICAL_ERROR is an internal invariant (e.g. iface-field filter miss /
    // corrupted key). When the path still has an object (even empty), do not
    // leak it - classic never surfaced these next to successful data.
    const clientErrors = ctx.errors.filter(error => {
      if (!(error as GraphQLError).extensions?.[CRITICAL_ERROR]) {
        return true;
      }
      const key = (error as GraphQLError).path?.[0];
      return key == null || data[key as string] == null;
    });
    if (clientErrors.length) {
      result.errors = clientErrors as any;
    }
  }
  return result;
}

/**
 * Deep-annotate a Fetch payload once so nested objects carry
 * OBJECT_SUBSCHEMA_SYMBOL for later entity hops.
 */
function annotateValue(value: any, errors: readonly any[], subschema: Subschema): any {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => annotateValue(item, errors, subschema));
  }
  stampSubschema(value, subschema, errors);
  for (const key of Object.keys(value)) {
    const child = value[key];
    if (child != null && typeof child === 'object') {
      annotateValue(child, [], subschema);
    }
  }
  return value;
}

/**
 * Prefer concrete object __typename over @interfaceObject interface names.
 */
function resolveMergedTypename(
  priorTypename: string | undefined,
  resultTypename: string | undefined,
  schema: GraphQLSchema,
): string | undefined {
  if (!resultTypename) {
    return priorTypename;
  }
  if (!priorTypename || priorTypename === resultTypename) {
    return resultTypename;
  }
  const priorType = schema.getType(priorTypename);
  const resultType = schema.getType(resultTypename);
  if (isObjectType(priorType) && isInterfaceType(resultType)) {
    return priorTypename;
  }
  if (isInterfaceType(priorType) && isObjectType(resultType)) {
    return resultTypename;
  }
  return resultTypename;
}

/**
 * Light entity merge - Hive `mergeFlattenEntities`:
 * `Object.assign(target, mergeDeep([target, entity]))` for nested payloads;
 * leaf-only hops skip mergeDeep and assign fields directly.
 */
function mergeEntityIntoParent(
  parent: Record<string, any>,
  resolverResult: Record<string, any>,
  schema: GraphQLSchema,
  subschema: Subschema,
): void {
  let hasNested = false;
  for (const key in resolverResult) {
    if (key === '__typename') {
      continue;
    }
    const v = resolverResult[key];
    if (v != null && typeof v === 'object') {
      hasNested = true;
      break;
    }
  }
  const priorTypename = parent.__typename as string | undefined;
  const resultTypename = resolverResult.__typename as string | undefined;
  if (!hasNested) {
    for (const key in resolverResult) {
      if (
        key === '__proto__' ||
        key === 'constructor' ||
        key === 'prototype' ||
        key === '__typename'
      ) {
        continue;
      }
      parent[key] = resolverResult[key];
    }
    parent.__typename = resolveMergedTypename(priorTypename, resultTypename, schema);
    stampSubschema(parent, subschema);
    return;
  }
  // Nested: Hive Object.assign + mergeDeep, then stamp symbols (mergeDeep
  // copies enumerable props only).
  const merged = mergeDeep([parent, resolverResult], false, true, true);
  Object.assign(parent, merged);
  parent.__typename = resolveMergedTypename(priorTypename, resultTypename, schema);
  stampSubschema(parent, subschema);
  // Annotate fresh nested objects from the hop so later entity hops can find
  // OBJECT_SUBSCHEMA_SYMBOL on children.
  for (const key in resolverResult) {
    if (key === '__typename') {
      continue;
    }
    const v = parent[key];
    if (v != null && typeof v === 'object') {
      annotateValue(v, [], subschema);
    }
  }
}

/**
 * Merge Parallel shared-root Fetch results into one object/list. Preserves
 * external-object symbols from the left-hand side when both sides are objects.
 */
function mergeRootValues(existing: any, incoming: any): any {
  if (existing == null) {
    return incoming;
  }
  if (incoming == null) {
    return existing;
  }
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    const len = Math.max(existing.length, incoming.length);
    const out: any[] = new Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = mergeRootValues(existing[i], incoming[i]);
    }
    return out;
  }
  if (
    typeof existing === 'object' &&
    typeof incoming === 'object' &&
    !Array.isArray(existing) &&
    !Array.isArray(incoming)
  ) {
    // mergeDeep drops non-enumerable symbols unless asked; shared-root Parallel
    // must keep ExternalObject annotations so alias-aware gateway resolvers run.
    // Do not merge symbols via mergeDeep — Subschema graphs are cyclic.
    const merged = mergeDeep([existing, incoming], false, true, true);
    if (merged && typeof merged === 'object') {
      const sourceSub =
        (existing as any)[OBJECT_SUBSCHEMA_SYMBOL] ?? (incoming as any)[OBJECT_SUBSCHEMA_SYMBOL];
      if (sourceSub) {
        const leftErrors = (existing as any)[UNPATHED_ERRORS_SYMBOL] as any[] | undefined;
        const rightErrors = (incoming as any)[UNPATHED_ERRORS_SYMBOL] as any[] | undefined;
        const errors =
          leftErrors?.length || rightErrors?.length
            ? [...(leftErrors ?? []), ...(rightErrors ?? [])]
            : [];
        stampSubschema(merged, sourceSub, errors);
      } else if ((merged as any)[UNPATHED_ERRORS_SYMBOL] == null) {
        // Still mark as external so defaultMergedResolver reads alias keys.
        (merged as any)[UNPATHED_ERRORS_SYMBOL] = [];
      }
      const leftMap = (existing as any)[FIELD_SUBSCHEMA_MAP_SYMBOL];
      const rightMap = (incoming as any)[FIELD_SUBSCHEMA_MAP_SYMBOL];
      if (leftMap || rightMap) {
        (merged as any)[FIELD_SUBSCHEMA_MAP_SYMBOL] = {
          ...rightMap,
          ...leftMap,
        };
      }
    }
    return merged;
  }
  return incoming;
}

/** Drop @skip/@include - already evaluated at plan time. */

function collectUsedVariableNames(node: SelectionNode): Set<string> {
  const used = new Set<string>();
  visit(node, {
    Variable(v) {
      used.add(v.name.value);
    },
  });
  return used;
}

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Map `_nullable_id` / `_nonNullable_id` response keys back to `id`. */
function unwrapNullabilityAliases(value: any): any {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(unwrapNullabilityAliases);
  }
  // Date/Buffer/ObjectId: Object.entries is empty → would become `{}`.
  if (!isPlainObject(value)) {
    return value;
  }
  const out: Record<string, any> = {};
  for (const [key, v] of Object.entries(value)) {
    const unwrapped = key.startsWith('_nullable_')
      ? key.slice('_nullable_'.length)
      : key.startsWith('_nonNullable_')
        ? key.slice('_nonNullable_'.length)
        : key;
    out[unwrapped] = unwrapNullabilityAliases(v);
  }
  return out;
}

function ensureUsedVariableValues(
  names: Iterable<string>,
  variableValues: Record<string, any>,
  variableDefaults?: Record<string, any>,
): void {
  for (const name of names) {
    ensureVariableValue(variableValues, name, variableDefaults);
  }
}

function collectEntitiesAtPath(data: any, path: PathSegment[]): Array<Record<string, any>> {
  let current: any[] = [data];
  for (const segment of path) {
    const next: any[] = [];
    for (const item of current) {
      if (item == null) {
        continue;
      }
      if (typeof segment === 'number') {
        if (Array.isArray(item)) {
          const el = item[segment];
          if (el != null) {
            next.push(el);
          }
        }
        continue;
      }
      const value = item[segment];
      if (Array.isArray(value)) {
        for (const el of value) {
          if (el != null && typeof el === 'object') {
            next.push(el);
          }
        }
      } else if (value != null && typeof value === 'object') {
        next.push(value);
      } else if (value != null && typeof item === 'object') {
        // Encapsulate `@resolveTo(__typename)` leaves a string (`"Query"`) at
        // the path. Promote in place to `{}` so nested Islands can attach —
        // same shape graphql-js builds when nested resolvers run on that parent.
        const promoted: Record<string, any> = {};
        item[segment] = promoted;
        next.push(promoted);
      }
    }
    current = next;
  }
  return current;
}

function executeFetchNode(
  node: Extract<StitchPlanNode, { kind: 'Fetch' }>,
  ctx: BackboneExecutionContext,
): MaybePromise<void> {
  const executor = getSubschemaExecutor(node.subschema);

  if (node.rootField) {
    const responseKey = node.rootField.alias?.value ?? node.rootField.name.value;
    const rootFieldNode = node.rootField;
    const writeRootResult = (value: any, errors: readonly GraphQLError[] = []) => {
      if (errors.length) {
        ctx.errors.push(
          ...locateRootFieldErrors(errors as GraphQLError[], responseKey, rootFieldNode),
        );
      }
      if (value !== undefined) {
        const annotated = annotateValue(unwrapNullabilityAliases(value), errors, node.subschema);
        if (annotated != null) {
          const rootType = getDefinedRootType(ctx.schema, ctx.operation.operation);
          const fieldDef = rootType.getFields()[rootFieldNode.name.value];
          if (fieldDef) {
            stampConcreteTypename(annotated, fieldDef.type);
          }
        }
        if (responseKey in ctx.data) {
          ctx.data[responseKey] = mergeRootValues(ctx.data[responseKey], annotated);
        } else {
          ctx.data[responseKey] = annotated;
        }
      } else if (errors.length && !(responseKey in ctx.data)) {
        // Subgraph down / errors-only result: expose null for the root key
        // so finalizeRootResult can apply nullability bubbling.
        ctx.data[responseKey] = null;
      }
      maybeAbortMutationAfterNullifiedRoot(ctx, responseKey, rootFieldNode.name.value);
    };

    const writeRootThrowFailure = (err: unknown) => {
      ctx.errors.push(errorFromFetchThrow(err, node.subschema, responseKey, rootFieldNode));
      if (!(responseKey in ctx.data)) {
        ctx.data[responseKey] = null;
      }
      maybeAbortMutationAfterNullifiedRoot(ctx, responseKey, rootFieldNode.name.value);
    };

    // Rename / encapsulate / defer transforms need delegateToSchema —
    // prebuilt documents use gateway field names and would miss subgraph renames.
    // Match Hive #2734: fieldName = schema field name, write returned value.
    if (node.subschema.transforms?.length) {
      const hopSubschema = node.subschema;
      const rootType = getDefinedRootType(ctx.schema, ctx.operation.operation);
      const fieldDef = rootType.getFields()[rootFieldNode.name.value];
      const args = fieldDef
        ? getArgumentValues(
            fieldDef,
            rootFieldNode,
            asGetArgumentValuesVariables(ctx.variableValues),
          )
        : {};
      const info = {
        ...(ctx.infoStub as any),
        schema: ctx.schema,
        parentType: rootType,
        returnType: fieldDef?.type,
        fieldName: rootFieldNode.name.value,
        fieldNodes: [rootFieldNode],
        fragments: ctx.fragments,
        operation: ctx.operation,
        variableValues: ctx.variableValues,
        path: { typename: rootType.name, key: responseKey, prev: undefined },
        rootValue: ctx.rootValue,
      };
      return handleMaybePromise(
        () =>
          delegateToSchema({
            schema: hopSubschema,
            operation: ctx.operation.operation,
            fieldName: rootFieldNode.name.value,
            args,
            selectionSet: rootFieldNode.selectionSet,
            context: ctx.contextValue,
            info: info as any,
            skipTypeMerging: true,
          }),
        value => writeRootResult(value),
        writeRootThrowFailure,
      );
    }

    // Plan prebuilds documents (both @skip/@include Condition branches).
    // Execute only selects the hop and binds variables — never rebuilds docs.
    const document = node.document;
    if (!document) {
      return writeRootThrowFailure(
        new GraphQLError(`Missing prebuilt document for root field ${rootFieldNode.name.value}`, {
          extensions: { code: 'MISSING_STITCH_PLAN_DOCUMENT' },
        }),
      );
    }
    let variables: Record<string, any> | undefined;
    if (node.variableNames?.length) {
      variables = {};
      for (const name of node.variableNames) {
        ensureVariableValue(ctx.variableValues, name, ctx.variableDefaults);
        if (name in ctx.variableValues) {
          variables[name] = ctx.variableValues[name];
        }
      }
    }

    const request: ExecutionRequest = {
      document,
      variables,
      context: ctx.contextValue,
      rootValue: node.subschema.rootValue ?? ctx.rootValue,
      operationType: ctx.operation.operation,
      operationName: ctx.operation.name?.value,
      signal: ctx.signal,
      subgraphName: node.subschema.name,
    };

    return handleMaybePromise(
      () => executor(request) as MaybePromise<ExecutionResult>,
      (result: ExecutionResult) => {
        const located = result.errors?.length ? (result.errors as GraphQLError[]) : [];
        if (result.data && responseKey in result.data) {
          writeRootResult(result.data[responseKey], located);
        } else {
          writeRootResult(undefined, located);
        }
      },
      writeRootThrowFailure,
    );
  }

  const flattenPaths = node.flattenPaths;
  if (!node.entityTypeName || !flattenPaths?.length) {
    return;
  }

  // Cast/Flatten: hydrate parents matching this entity type, including
  // concrete implementers of an @interfaceObject interface (User -> NodeWithName).
  const entityType = ctx.schema.getType(node.entityTypeName);
  const matchParent = (p: Record<string, any>) => {
    if (p == null) {
      return false;
    }
    if (p.__typename === node.entityTypeName) {
      return true;
    }
    // Typeless parents: only valid for @interfaceObject interface hops.
    // Concrete Cast (Cat vs Dog) must not claim every typeless list item.
    if (p.__typename == null) {
      return isInterfaceType(entityType);
    }
    if (!isInterfaceType(entityType)) {
      return false;
    }
    const runtime = ctx.schema.getType(p.__typename);
    return (
      isObjectType(runtime) && runtime.getInterfaces().some(i => i.name === node.entityTypeName)
    );
  };
  let parents: Array<Record<string, any>> = [];
  const seen = new Set<Record<string, any>>();
  for (const path of flattenPaths) {
    for (const p of collectEntitiesAtPath(ctx.data, path)) {
      if (matchParent(p) && !seen.has(p)) {
        seen.add(p);
        parents.push(p);
      }
    }
  }
  if (!parents.length) {
    return;
  }

  // Always-on entity reuse (queries): copy by rep-hash / parent leaves, skip HTTP.
  if (entityReuseAllowed(ctx)) {
    const before = parents.length;
    parents = parents.filter(
      p =>
        !tryReuseEntityIntoParent(ctx, node.subschema, node.entityTypeName!, p, node.selectionSet),
    );
    if (!parents.length) {
      return;
    }
  }

  const stitchingInfo = ctx.schema.extensions?.stitchingInfo as StitchingInfo | undefined;
  const mergedTypeInfo = stitchingInfo?.mergedTypes[node.entityTypeName];
  if (!mergedTypeInfo) {
    return;
  }

  const type = ctx.schema.getType(node.entityTypeName);
  // Object types and @interfaceObject interfaces both carry merge resolvers.
  if (!isObjectType(type) && !isInterfaceType(type)) {
    return;
  }

  // Execute the planned target directly instead of re-running
  // delegationPlanBuilder, which can mark the hop non-proxiable based on
  // source *schema* keys even when the parent object already has them.
  const resolver = mergedTypeInfo.resolvers.get(node.subschema);
  if (!resolver) {
    // Fall back to mergeFields when no explicit merge resolver is registered.
    const planningParentField: FieldNode = {
      kind: Kind.FIELD,
      name: { kind: Kind.NAME, value: node.entityTypeName },
      selectionSet: node.selectionSet,
    };
    const jobs: MaybePromise<any>[] = [];
    for (const parent of parents) {
      const sourceSubschema =
        ((parent as any)[OBJECT_SUBSCHEMA_SYMBOL] as Subschema | undefined) ?? node.subschema;
      const info = {
        ...(ctx.infoStub as any),
        schema: ctx.schema,
        parentType: type,
        returnType: type,
        fieldName: node.entityTypeName,
        fieldNodes: [planningParentField],
        fragments: ctx.fragments,
        operation: ctx.operation,
        variableValues: ctx.variableValues,
        path: {
          typename: node.entityTypeName,
          key: flattenPaths[0]!.at(-1),
          prev: undefined,
        },
      };
      jobs.push(
        mergeFields(mergedTypeInfo, parent, sourceSubschema, ctx.contextValue, info, [
          planningParentField,
        ]),
      );
    }
    return handleMaybePromise(
      () => awaitMaybePromises(jobs),
      () => {
        for (const parent of parents) {
          stampSubschema(parent, node.subschema);
          rememberEntityForReuse(ctx, node.subschema, node.entityTypeName!, parent);
        }
      },
    );
  }

  const info = {
    ...(ctx.infoStub as any),
    schema: ctx.schema,
    parentType: type,
    returnType: type,
    fieldName: node.entityTypeName,
    fieldNodes: [
      {
        kind: Kind.FIELD,
        name: { kind: Kind.NAME, value: node.entityTypeName },
        selectionSet: node.selectionSet,
      },
    ],
    fragments: ctx.fragments,
    operation: ctx.operation,
    variableValues: ctx.variableValues,
    path: {
      typename: node.entityTypeName,
      key: flattenPaths[0]!.at(-1),
      prev: undefined,
    },
  };

  const hopSubschema = node.subschema;

  // Hive-style: one batched _entities hop for all parents (single
  // batchDelegateToSchema / DataLoader batch instead of N resolver entries).
  const batched = tryExecuteEntitiesBatch(node, parents, hopSubschema, ctx);
  if (batched !== undefined) {
    return batched;
  }

  // Dedupe same-rep parents within this hop (classic args merges have no
  // argsFromKeys batch path). Resolve once per representation hash, fan out.
  const groups = new Map<string, Array<Record<string, any>>>();
  const unhashed: Array<Record<string, any>> = [];
  for (const parent of parents) {
    const hash = representationHash(parent, hopSubschema, node.entityTypeName!);
    if (!hash) {
      unhashed.push(parent);
      continue;
    }
    let list = groups.get(hash);
    if (!list) {
      list = [];
      groups.set(hash, list);
    }
    list.push(parent);
  }

  const resolveInto = (parent: Record<string, any>, siblings: Array<Record<string, any>>) =>
    handleMaybePromise(
      () =>
        resolver(
          parent,
          ctx.contextValue,
          info,
          hopSubschema,
          node.selectionSet,
          undefined,
          type as any,
        ),
      resolverResult => {
        if (resolverResult == null || typeof resolverResult !== 'object') {
          return;
        }
        if (resolverResult instanceof Error) {
          ctx.errors.push(resolverResult);
          return;
        }
        const entity = resolverResult as Record<string, any>;
        for (const p of siblings) {
          mergeEntityIntoParent(p, entity, ctx.schema, node.subschema);
          rememberEntityForReuse(ctx, node.subschema, node.entityTypeName!, p);
        }
      },
    );

  const jobs: MaybePromise<any>[] = [];
  for (const group of groups.values()) {
    jobs.push(resolveInto(group[0]!, group));
  }
  for (const parent of unhashed) {
    jobs.push(resolveInto(parent, [parent]));
  }

  return handleMaybePromise(
    () => awaitMaybePromises(jobs),
    () => undefined,
  );
}

/**
 * Batched type-merge hop: project keys once, one merge-field call for all
 * parents, index-merge. Uses MergedTypeConfig (`fieldName`/`argsFromKeys`) -
 * federation `_entities` or plain stitching `usersByIds` alike.
 */
function tryExecuteEntitiesBatch(
  node: Extract<StitchPlanNode, { kind: 'Fetch' }>,
  parents: Array<Record<string, any>>,
  hopSubschema: Subschema,
  ctx: BackboneExecutionContext,
): MaybePromise<void> | undefined {
  const typeName = node.entityTypeName!;
  const entry = getBatchedMergeEntry(hopSubschema, typeName);
  if (!entry) {
    return undefined;
  }

  const keyFn = entry.key;
  const cacheKeyFn = entry.dataLoaderOptions?.cacheKeyFn;
  const keys: any[] = [];
  const identityToIndex = new Map<string, number>();
  const parentKeyIndex: number[] = new Array(parents.length);
  for (let i = 0; i < parents.length; i++) {
    const key = keyFn(parents[i]!);
    if (key == null) {
      parentKeyIndex[i] = -1;
      continue;
    }
    const identity = cacheKeyFn != null ? String(cacheKeyFn(key)) : JSON.stringify(key);
    let idx = identityToIndex.get(identity);
    if (idx == null) {
      idx = keys.length;
      identityToIndex.set(identity, idx);
      keys.push(key);
    }
    parentKeyIndex[i] = idx;
  }
  if (!keys.length) {
    return undefined;
  }

  const mergeResults = (results: any) => {
    if (!Array.isArray(results)) {
      if (results instanceof Error) {
        ctx.errors.push(results);
      }
      return;
    }
    for (let i = 0; i < parents.length; i++) {
      const ki = parentKeyIndex[i]!;
      if (ki < 0) {
        continue;
      }
      const entity = results[ki];
      if (entity instanceof Error) {
        ctx.errors.push(entity);
        continue;
      }
      if (entity == null || typeof entity !== 'object') {
        continue;
      }
      mergeEntityIntoParent(parents[i]!, entity as Record<string, any>, ctx.schema, node.subschema);
      rememberEntityForReuse(ctx, node.subschema, node.entityTypeName!, parents[i]!);
    }
  };

  // Prebuilt document skips Transformer - only safe for leaf-only selections
  // (inventory/username style, including @include/@skip). Nested selections
  // (field args, deep merges) fall through to per-parent merge resolvers so
  // batchDelegate DataLoader keys include field arguments.
  if (!(node.document && isLeafOnlySelection(node.selectionSet))) {
    return undefined;
  }
  const args = bindMergeHopVariables(
    entry.argsFromKeys(keys) as Record<string, any>,
    node.variableNames,
    ctx,
  );
  const executor = getSubschemaExecutor(hopSubschema);
  return handleMaybePromise(
    () =>
      executor({
        document: node.document!,
        variables: args,
        context: ctx.contextValue,
        rootValue: hopSubschema.rootValue ?? ctx.rootValue,
        operationType: OperationTypeNode.QUERY,
        signal: ctx.signal,
        subgraphName: hopSubschema.name,
      } satisfies ExecutionRequest) as MaybePromise<ExecutionResult>,
    (result: ExecutionResult) => {
      if (result.errors?.length) {
        ctx.errors.push(...result.errors);
      }
      let payload = result.data?.[entry.fieldName];
      // Errors-only responses leave payload undefined; do not call unwrap
      // callbacks that assume an array (mergeResults already no-ops on absent).
      if (entry.valuesFromResults != null && payload != null) {
        payload = entry.valuesFromResults(payload, keys);
      }
      mergeResults(payload);
    },
  );
}

function executeIslandNode(
  node: Extract<StitchPlanNode, { kind: 'Island' }>,
  ctx: BackboneExecutionContext,
): MaybePromise<void> {
  const parentType = ctx.schema.getType(node.parentTypeName);
  if (!isObjectType(parentType) && !isInterfaceType(parentType)) {
    return;
  }
  const fieldName = node.fieldNode.name.value;
  const responseKey = node.fieldNode.alias?.value ?? fieldName;

  // Meta-field: no GraphQLField.resolve on the type.
  if (fieldName === '__typename') {
    ctx.data[responseKey] = node.parentTypeName;
    return;
  }

  const field = parentType.getFields()[fieldName];
  if (!field?.resolve) {
    return;
  }
  // Root Islands must bypass backboneRootProxyingResolver (would join the
  // in-flight plan and deadlock). Nested Islands keep field.resolve (wraps).
  const rootType = getDefinedRootType(ctx.schema, ctx.operation.operation);
  const isRootIsland = parentType === rootType;
  const resolve = (isRootIsland ? getOriginalRootResolve(field) : undefined) ?? field.resolve;
  ensureUsedVariableValues(
    collectUsedVariableNames(node.fieldNode),
    ctx.variableValues,
    ctx.variableDefaults,
  );
  const args = getArgumentValues(
    field,
    node.fieldNode,
    asGetArgumentValuesVariables(ctx.variableValues),
  );

  const flattenPaths = node.flattenPaths;

  // Nested Island: resolve on every parent object at the flatten path(s).
  if (flattenPaths?.length) {
    const parents: Array<Record<string, any>> = [];
    const seen = new Set<Record<string, any>>();
    for (const path of flattenPaths) {
      for (const p of collectEntitiesAtPath(ctx.data, path)) {
        if (p != null && typeof p === 'object' && !seen.has(p)) {
          seen.add(p);
          parents.push(p);
        }
      }
    }
    if (!parents.length) {
      return;
    }
    const jobs = parents.map(parent => {
      const info = {
        ...(ctx.infoStub as any),
        schema: ctx.schema,
        parentType,
        returnType: field.type,
        fieldName,
        fieldNodes: [node.fieldNode],
        fragments: ctx.fragments,
        operation: ctx.operation,
        variableValues: ctx.variableValues,
        path: {
          typename: node.parentTypeName,
          key: responseKey,
          prev: undefined,
        },
      };
      return handleMaybePromise(
        () => resolve!(parent, args, ctx.contextValue, info),
        result => {
          parent[responseKey] = result;
        },
        err => {
          ctx.errors.push(errorFromIslandThrow(err, responseKey, node.fieldNode));
          parent[responseKey] = null;
        },
      );
    });
    // `continue` is a separate dataflow hop gated on this Island's id -
    // do not tree-walk it here (would double-execute).
    return awaitMaybePromises(jobs);
  }

  // Root Island: write into ctx.data[responseKey].
  const info = {
    ...(ctx.infoStub as any),
    schema: ctx.schema,
    parentType: rootType,
    returnType: field.type,
    fieldName,
    fieldNodes: [node.fieldNode],
    fragments: ctx.fragments,
    operation: ctx.operation,
    variableValues: ctx.variableValues,
    path: { typename: rootType.name, key: responseKey, prev: undefined },
  };

  return handleMaybePromise(
    () => resolve!(ctx.rootValue, args, ctx.contextValue, info),
    result => {
      ctx.data[responseKey] = result;
      // Resolver returned null for a NonNull mutation root (no throw): same
      // abort as Fetch writeRootResult / Island rejection path.
      maybeAbortMutationAfterNullifiedRoot(ctx, responseKey, fieldName);
      // continue: dataflow hop, not tree execute
    },
    err => {
      // Local/gateway Island throws must become GraphQL errors (classic parity),
      // not reject the whole plan - otherwise result.errors is empty.
      ctx.errors.push(errorFromIslandThrow(err, responseKey, node.fieldNode));
      ctx.data[responseKey] = null;
      maybeAbortMutationAfterNullifiedRoot(ctx, responseKey, fieldName);
    },
  );
}

type ExecutableHop = ScheduledHop;

function rootResponseKey(hop: Extract<StitchPlanNode, { kind: 'Fetch' }>): string | null {
  if (!hop.rootField) {
    return null;
  }
  return hop.rootField.alias?.value ?? hop.rootField.name.value;
}

function entityPathKey(hop: Extract<StitchPlanNode, { kind: 'Fetch' }>): string | null {
  if (!hop.entityTypeName) {
    return null;
  }
  return JSON.stringify(hop.flattenPaths ?? null);
}

function selectedEntityFields(hop: Extract<StitchPlanNode, { kind: 'Fetch' }>): Set<string> {
  const names = new Set<string>();
  for (const sel of hop.selectionSet.selections) {
    if (sel.kind === Kind.FIELD && sel.name.value !== '__typename') {
      names.add(sel.name.value);
    }
  }
  return names;
}

function runOneHop(hop: ExecutableHop, ctx: BackboneExecutionContext): MaybePromise<void> {
  if (!evaluateRunIf(hop.runIf, ctx.variableValues, ctx.variableDefaults)) {
    return;
  }
  if (hop.kind === 'BatchFetch') {
    return executeBatchFetchNode(hop, ctx);
  }
  if (hop.kind === 'Island') {
    return executeIslandNode(hop, ctx);
  }
  return executeFetchNode(hop, ctx);
}

/** Top-level response keys selected under a root Fetch (skip __typename). */
function rootFetchTopFields(fetch: Extract<StitchPlanNode, { kind: 'Fetch' }>): string[] {
  const sels = fetch.rootField?.selectionSet?.selections ?? [];
  const names: string[] = [];
  for (const s of sels) {
    if (s.kind === Kind.FIELD && s.name.value !== '__typename') {
      names.push(s.alias?.value ?? s.name.value);
    }
  }
  return names;
}

/**
 * True when a failed sibling's selection still shows as null/missing on the
 * merged object (e.g. downed subgraph left `subgraph2: null`). List roots that
 * another sibling already filled do not count as holes.
 */
function failedFetchExplainsHole(
  fetch: Extract<StitchPlanNode, { kind: 'Fetch' }>,
  merged: any,
): boolean {
  if (merged == null) {
    return true;
  }
  if (Array.isArray(merged)) {
    return false;
  }
  if (typeof merged !== 'object') {
    return false;
  }
  for (const name of rootFetchTopFields(fetch)) {
    if (merged[name] == null) {
      return true;
    }
  }
  return false;
}

/**
 * Shared-root Parallel: isolate per-subgraph errors then deep-merge (provides /
 * union-intersection - one owner errors while another returns data).
 *
 * Lift sibling errors only when they explain a hole in the merged object (or
 * every sibling failed). Drop speculative-subgraph errors when another owner
 * already filled the selection (@provides / union probes).
 */
function runSameKeyRootFetches(
  fetches: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>>,
  ctx: BackboneExecutionContext,
): MaybePromise<void> {
  // Grouped shared-root path bypasses executeHop's runIf check; filter here.
  const runnable = fetches.filter(child =>
    evaluateRunIf(child.runIf, ctx.variableValues, ctx.variableDefaults),
  );
  if (!runnable.length) {
    return;
  }
  const responseKey = rootResponseKey(runnable[0]!)!;
  const jobs = runnable.map(child => {
    const childErrors: any[] = [];
    const childCtx: BackboneExecutionContext = {
      ...ctx,
      data: {},
      errors: childErrors,
    };
    return handleMaybePromise(
      () => executeFetchNode(child, childCtx),
      () => ({
        data: childCtx.data[responseKey],
        errors: childErrors,
      }),
    );
  });
  return handleMaybePromise(
    () => allMaybePromises(jobs),
    (parts: Array<{ data: any; errors: any[] }>) => {
      let merged: any;
      for (const part of parts) {
        // Errors-only siblings set `data[responseKey] = null`; skip that null
        // so a successful sibling's object is not replaced by root null.
        if (part.data != null) {
          merged = mergeRootValues(merged, part.data);
        }
      }
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]!;
        if (!part.errors.length) {
          continue;
        }
        if (merged === undefined || failedFetchExplainsHole(runnable[i]!, merged)) {
          ctx.errors.push(...part.errors);
          // Stamp onto the merged ExternalObject so nested field resolves can
          // rethrow the original subgraph error (not a nullability bubble).
          if (merged != null && typeof merged === 'object') {
            const existing = (merged as any)[UNPATHED_ERRORS_SYMBOL] as any[] | undefined;
            (merged as any)[UNPATHED_ERRORS_SYMBOL] = existing?.length
              ? [...existing, ...part.errors]
              : [...part.errors];
          }
        }
      }
      if (merged !== undefined) {
        ctx.data[responseKey] = merged;
      } else if (parts.some(part => part.errors.length)) {
        // Every sibling failed or returned null - expose null for nullability
        // bubbling in finalizeRootResult.
        ctx.data[responseKey] = null;
      }
    },
  );
}

/**
 * Continuous dataflow dispatch from `dependsOn` / `completesIds`.
 *
 * Uses a cached {@link StitchPlanSchedule} when the hop set matches the plan
 * (no Condition). Same-key root Fetches that become ready together still share
 * isolated merge; overlapping same-path entity field writes in one ready flush
 * stay serialized so leaf merges cannot clobber each other.
 */
export function executeDataflowPlan(
  root: StitchPlanNode,
  ctx: BackboneExecutionContext,
  cachedSchedule?: StitchPlanSchedule,
): MaybePromise<void> {
  const hops: ExecutableHop[] = [];
  collectExecutableHops(root, hops, ctx.variableValues ?? {}, ctx.variableDefaults);
  if (!hops.length) {
    return;
  }
  if (!hops.every(h => h.id != null && h.dependsOn != null)) {
    throw new Error('Stitch plan hops missing id/dependsOn; annotateFetchDeps required');
  }

  const n = hops.length;
  const schedule =
    cachedSchedule && cachedSchedule.waits.length === n ? cachedSchedule : buildPlanSchedule(hops);
  const waits = freshWaits(schedule);
  const dependents = schedule.dependents;

  const ready: number[] = [];
  for (let i = 0; i < n; i++) {
    if (waits[i] === 0) {
      ready.push(i);
    }
  }

  let remaining = n;
  let inFlight = 0;
  let settled = false;
  let sawAsync = false;
  let failed = false;
  let pumping = false;
  let resolveAll!: () => void;
  let rejectAll!: (err: unknown) => void;
  const allDone = new Promise<void>((resolve, reject) => {
    resolveAll = resolve;
    rejectAll = reject;
  });

  const tryFinish = () => {
    if (settled) {
      return;
    }
    if (remaining === 0 && inFlight === 0) {
      settled = true;
      resolveAll();
    }
  };

  const fail = (err: unknown) => {
    if (settled) {
      return;
    }
    settled = true;
    failed = true;
    rejectAll(err);
  };

  const release = (index: number) => {
    remaining--;
    for (const d of dependents[index]!) {
      waits[d]!--;
      if (waits[d] === 0) {
        ready.push(d);
      }
    }
  };

  /** Start work; on settle release dependents and pump. Re-entrant safe. */
  const track = (indices: number[], run: () => MaybePromise<void>) => {
    inFlight++;
    const result = handleMaybePromise(
      run,
      () => {
        for (const i of indices) {
          release(i);
        }
        inFlight--;
        pump();
        tryFinish();
      },
      err => {
        inFlight--;
        fail(err);
      },
    );
    if (isPromise(result)) {
      sawAsync = true;
    }
  };

  const pump = (): void => {
    if (settled || pumping) {
      return;
    }
    pumping = true;
    try {
      // Drain ready repeatedly so sync completions (via track -> release)
      // that push while we are pumping are picked up without recursion.
      for (;;) {
        if (!ready.length) {
          break;
        }
        // Snapshot current ready set as one flush so same-key root merges
        // and overlapping entity writes can be batched / serialized.
        const flush = ready.splice(0, ready.length);

        // After a non-null mutation root failure, skip remaining hops without
        // running them (no further side effects; data will be null anyway).
        if (ctx.abortRemainingHops) {
          for (const index of flush) {
            release(index);
          }
          continue;
        }

        const rootGroups = new Map<
          string,
          Array<{
            index: number;
            hop: Extract<StitchPlanNode, { kind: 'Fetch' }>;
          }>
        >();
        const rest: Array<{ index: number; hop: ExecutableHop }> = [];
        for (const index of flush) {
          const hop = hops[index]!;
          if (hop.kind === 'Fetch') {
            const key = rootResponseKey(hop);
            if (key != null) {
              let list = rootGroups.get(key);
              if (!list) {
                list = [];
                rootGroups.set(key, list);
              }
              list.push({ index, hop });
              continue;
            }
          }
          rest.push({ index, hop });
        }

        for (const group of rootGroups.values()) {
          if (group.length > 1) {
            track(
              group.map(g => g.index),
              () =>
                runSameKeyRootFetches(
                  group.map(g => g.hop),
                  ctx,
                ),
            );
          } else {
            rest.push(group[0]!);
          }
        }

        const entityByPath = new Map<
          string,
          Array<{
            index: number;
            hop: Extract<StitchPlanNode, { kind: 'Fetch' }>;
          }>
        >();
        const nonEntity: Array<{ index: number; hop: ExecutableHop }> = [];
        for (const item of rest) {
          if (item.hop.kind === 'Fetch') {
            const pk = entityPathKey(item.hop);
            if (pk != null) {
              let list = entityByPath.get(pk);
              if (!list) {
                list = [];
                entityByPath.set(pk, list);
              }
              list.push({
                index: item.index,
                hop: item.hop,
              });
              continue;
            }
          }
          nonEntity.push(item);
        }

        for (const group of entityByPath.values()) {
          let overlapping = false;
          if (group.length > 1) {
            const fieldSets = group.map(g => selectedEntityFields(g.hop));
            outer: for (let i = 0; i < fieldSets.length; i++) {
              for (let j = i + 1; j < fieldSets.length; j++) {
                for (const name of fieldSets[i]!) {
                  if (fieldSets[j]!.has(name)) {
                    overlapping = true;
                    break outer;
                  }
                }
              }
            }
          }
          if (overlapping) {
            // Serialize overlapping same-path writers; release as one unit.
            // Use runOneHop so runIf gates apply (same as non-overlapping path).
            track(
              group.map(g => g.index),
              () => {
                let chain: MaybePromise<void>;
                for (const item of group) {
                  chain = handleMaybePromise(
                    () => chain,
                    () => runOneHop(item.hop, ctx),
                  );
                }
                return chain;
              },
            );
          } else {
            for (const item of group) {
              nonEntity.push(item);
            }
          }
        }

        for (const item of nonEntity) {
          track([item.index], () => runOneHop(item.hop, ctx));
        }
      }

      if (remaining > 0 && inFlight === 0 && !ready.length) {
        // Incomplete dependsOn / schedule bug - do not hang.
        fail(
          new Error(
            'Stitch dataflow stalled: hops remain but none are ready (missing dependsOn edge?)',
          ),
        );
      }
    } finally {
      pumping = false;
    }
  };

  pump();
  tryFinish();
  // Sync success: nothing to await. Sync failure: return the rejected promise
  // so callers do not finalize as if the plan succeeded.
  if (settled && !sawAsync) {
    return failed ? allDone : undefined;
  }
  return allDone;
}

function matchEntityParent(
  parent: Record<string, any>,
  entityTypeName: string,
  schema: GraphQLSchema,
): boolean {
  if (parent == null) {
    return false;
  }
  if (parent.__typename === entityTypeName) {
    return true;
  }
  const entityType = schema.getType(entityTypeName);
  if (parent.__typename == null) {
    return isInterfaceType(entityType);
  }
  if (!isInterfaceType(entityType)) {
    return false;
  }
  const runtime = schema.getType(parent.__typename);
  return isObjectType(runtime) && runtime.getInterfaces().some(i => i.name === entityTypeName);
}

function collectAliasParents(
  ctx: BackboneExecutionContext,
  entityTypeName: string,
  flattenPaths: PathSegment[][],
): Array<Record<string, any>> {
  const parents: Array<Record<string, any>> = [];
  const seen = new Set<Record<string, any>>();
  for (const path of flattenPaths) {
    for (const p of collectEntitiesAtPath(ctx.data, path)) {
      if (matchEntityParent(p, entityTypeName, ctx.schema) && !seen.has(p)) {
        seen.add(p);
        parents.push(p);
      }
    }
  }
  return parents;
}

function projectRepresentations(
  parents: Array<Record<string, any>>,
  hopSubschema: Subschema,
  entityTypeName: string,
): {
  keys: any[];
  parentKeyIndex: number[];
  entry: {
    fieldName: string;
    key: (p: any) => any;
    argsFromKeys: (keys: ReadonlyArray<any>) => Record<string, any>;
  };
} | null {
  const entry = getBatchedMergeEntry(hopSubschema, entityTypeName);
  if (!entry) {
    return null;
  }
  const cacheKeyFn = entry.dataLoaderOptions?.cacheKeyFn;
  const keys: any[] = [];
  const identityToIndex = new Map<string, number>();
  const parentKeyIndex: number[] = new Array(parents.length);
  for (let i = 0; i < parents.length; i++) {
    const key = entry.key(parents[i]!);
    if (key == null) {
      parentKeyIndex[i] = -1;
      continue;
    }
    const identity = cacheKeyFn != null ? String(cacheKeyFn(key)) : JSON.stringify(key);
    let idx = identityToIndex.get(identity);
    if (idx == null) {
      idx = keys.length;
      identityToIndex.set(identity, idx);
      keys.push(key);
    }
    parentKeyIndex[i] = idx;
  }
  return {
    keys,
    parentKeyIndex,
    entry: {
      fieldName: entry.fieldName,
      key: entry.key,
      argsFromKeys: entry.argsFromKeys,
    },
  };
}

type BatchAliasPrep = {
  alias: string;
  entityTypeName: string;
  parents: Array<Record<string, any>>;
  parentKeyIndex: number[];
  /** Offset of this alias's keys inside the concatenated representations array. */
  keyOffset: number;
  keyCount: number;
};

/**
 * True when selection is only scalar/enum fields (+ __typename) - no nests or
 * field args. Inline fragments and `@include`/`@skip` are allowed: prebuilt
 * merge docs declare client variable defs (see buildBatchedMergeDocument).
 * Nested selections / field args still need Transformer / merge resolvers.
 */
function isLeafOnlySelection(selectionSet: SelectionSetNode): boolean {
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.INLINE_FRAGMENT) {
      if (!sel.selectionSet || !isLeafOnlySelection(sel.selectionSet)) {
        return false;
      }
      continue;
    }
    if (sel.kind !== Kind.FIELD) {
      return false;
    }
    if (sel.name.value === '__typename') {
      continue;
    }
    if (sel.selectionSet || sel.arguments?.length) {
      return false;
    }
  }
  return true;
}

/** Bind client vars from ctx onto merge-arg variables from argsFromKeys. */
function bindMergeHopVariables(
  mergeArgs: Record<string, any>,
  clientVariableNames: readonly string[] | undefined,
  ctx: BackboneExecutionContext,
): Record<string, any> {
  if (!clientVariableNames?.length) {
    return mergeArgs;
  }
  const variables = { ...mergeArgs };
  for (const name of clientVariableNames) {
    ensureVariableValue(ctx.variableValues, name, ctx.variableDefaults);
    if (name in ctx.variableValues) {
      variables[name] = ctx.variableValues[name];
    }
  }
  return variables;
}

/**
 * Multi-type BatchFetch - one prebuilt merge-field document with inline
 * fragments for every alias, one subgraph HTTP round-trip, then slice the
 * result array by key ranges. Nested alias selections fall back to parallel
 * Fetches (gateway `batch` executor still collapses same-tick merge fields).
 */
function executeBatchFetchNode(
  node: Extract<StitchPlanNode, { kind: 'BatchFetch' }>,
  ctx: BackboneExecutionContext,
): MaybePromise<void> {
  if (!node.aliases.length) {
    return;
  }
  const activeAliases = node.aliases.filter(a =>
    evaluateRunIf(a.runIf ?? node.runIf, ctx.variableValues, ctx.variableDefaults),
  );
  if (!activeAliases.length) {
    return;
  }

  // Prefer one concatenated merge-field HTTP whenever the plan attached a
  // document and every alias is leaf-only (scalars + @include/@skip). Nested
  // / arg-bearing aliases fall through to parallel Fetch (Transformer).
  if (node.document && activeAliases.every(a => isLeafOnlySelection(a.selectionSet))) {
    const prepared: BatchAliasPrep[] = [];
    const allKeys: any[] = [];
    let canRawBatch = true;
    let mergeEntry: ReturnType<typeof getBatchedMergeEntry> = null;

    for (let i = 0; i < activeAliases.length; i++) {
      const a = activeAliases[i]!;
      let parents = collectAliasParents(ctx, a.entityTypeName, a.flattenPaths);
      if (entityReuseAllowed(ctx) && parents.length) {
        parents = parents.filter(
          p => !tryReuseEntityIntoParent(ctx, node.subschema, a.entityTypeName, p, a.selectionSet),
        );
      }
      if (!parents.length) {
        prepared.push({
          alias: a.alias,
          entityTypeName: a.entityTypeName,
          parents: [],
          parentKeyIndex: [],
          keyOffset: allKeys.length,
          keyCount: 0,
        });
        continue;
      }
      const projected = projectRepresentations(parents, node.subschema, a.entityTypeName);
      if (!projected) {
        canRawBatch = false;
        break;
      }
      const nextEntry = getBatchedMergeEntry(node.subschema, a.entityTypeName);
      if (!nextEntry) {
        canRawBatch = false;
        break;
      }
      // Raw BatchFetch applies one valuesFromResults to the combined payload.
      // Mixed callbacks across aliases would reorder/reshape the wrong slice.
      if (mergeEntry != null && mergeEntry.valuesFromResults !== nextEntry.valuesFromResults) {
        canRawBatch = false;
        break;
      }
      mergeEntry = nextEntry;
      const keyOffset = allKeys.length;
      for (const key of projected.keys) {
        allKeys.push(key);
      }
      prepared.push({
        alias: a.alias,
        entityTypeName: a.entityTypeName,
        parents,
        parentKeyIndex: projected.parentKeyIndex,
        keyOffset,
        keyCount: projected.keys.length,
      });
    }

    if (canRawBatch && mergeEntry) {
      if (!allKeys.length) {
        return;
      }
      const fieldName = mergeEntry.fieldName;
      const variables = bindMergeHopVariables(
        mergeEntry.argsFromKeys(allKeys),
        node.variableNames,
        ctx,
      );
      const executor = getSubschemaExecutor(node.subschema);
      return handleMaybePromise(
        () =>
          executor({
            document: node.document!,
            variables,
            context: ctx.contextValue,
            rootValue: node.subschema.rootValue ?? ctx.rootValue,
            operationType: OperationTypeNode.QUERY,
            signal: ctx.signal,
            subgraphName: node.subschema.name,
          } satisfies ExecutionRequest) as MaybePromise<ExecutionResult>,
        (result: ExecutionResult) => {
          if (result.errors?.length) {
            ctx.errors.push(...result.errors);
          }
          let entities = result.data?.[fieldName];
          if (mergeEntry.valuesFromResults != null && entities != null) {
            entities = mergeEntry.valuesFromResults(entities, allKeys);
          }
          if (!Array.isArray(entities)) {
            return;
          }
          for (const prep of prepared) {
            if (!prep.keyCount) {
              continue;
            }
            for (let i = 0; i < prep.parents.length; i++) {
              const ki = prep.parentKeyIndex[i]!;
              if (ki < 0) {
                continue;
              }
              const entity = entities[prep.keyOffset + ki];
              if (entity instanceof Error) {
                ctx.errors.push(entity);
                continue;
              }
              if (entity == null || typeof entity !== 'object') {
                continue;
              }
              mergeEntityIntoParent(
                prep.parents[i]!,
                entity as Record<string, any>,
                ctx.schema,
                node.subschema,
              );
              rememberEntityForReuse(ctx, node.subschema, prep.entityTypeName, prep.parents[i]!);
            }
          }
        },
        err => {
          ctx.errors.push(
            errorFromFetchThrow(err, node.subschema, node.aliases[0]?.alias ?? fieldName),
          );
        },
      );
    }
  }

  // Nested / abstract aliases: parallel Fetch (gateway batch executor merges
  // same-tick merge fields when `batch` is enabled).
  const jobs = activeAliases.map(a =>
    executeFetchNode(
      {
        kind: 'Fetch',
        subschema: node.subschema,
        entityTypeName: a.entityTypeName,
        selectionSet: a.selectionSet,
        flattenPaths: a.flattenPaths,
        runIf: a.runIf,
      },
      ctx,
    ),
  );
  return awaitMaybePromises(jobs);
}

export function executeStitchPlan(
  schema: GraphQLSchema,
  plan: StitchPlan,
  request: ExecutionRequest,
): MaybePromise<ExecutionResult> {
  const operation = getOperationASTFromRequest(request) ?? plan.operation;
  const fragments =
    Object.keys(plan.fragments).length > 0
      ? plan.fragments
      : getFragmentsFromDocument(request.document);

  // Live map: defaults from the plan are written in on first read (Condition /
  // runIf / hop args). Drop Yoga's undefined placeholders without filling defaults.
  const variableValues: Record<string, any> = { ...(request.variables ?? {}) };
  for (const key of Object.keys(variableValues)) {
    if (variableValues[key] === undefined) {
      delete variableValues[key];
    }
  }

  const contextValue =
    request.context != null && typeof request.context === 'object'
      ? request.context
      : Object.create(null);
  // Let root proxying resolvers know Island resolvers must use originals.
  (contextValue as any)[BACKBONE_EXECUTING] = true;

  const ctx: BackboneExecutionContext = {
    schema,
    document: request.document,
    operation,
    fragments,
    variableValues,
    variableDefaults: plan.variableDefaults,
    contextValue,
    rootValue: request.rootValue,
    signal: request.signal,
    data: {},
    errors: [],
    infoStub: {},
    entityByRepHash: new Map(),
  };

  return handleMaybePromise(
    () => executeDataflowPlan(plan.root, ctx, plan.schedule),
    () => finalizeRootResult(ctx),
    undefined,
    () => {
      // Clear even when the plan rejects so later field wrappers do not take
      // the in-progress Island path on a dead execution.
      delete (contextValue as any)[BACKBONE_EXECUTING];
      (contextValue as any)[BACKBONE_HYDRATED] = true;
    },
  );
}
