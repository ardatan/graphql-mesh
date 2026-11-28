import {
  GraphQLError,
  isObjectType,
  Kind,
  type GraphQLFieldResolver,
  type GraphQLSchema,
} from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { getFragmentsFromDocument } from '@graphql-tools/executor';
import {
  getOperationASTFromRequest,
  isAsyncIterable,
  type ExecutionRequest,
  type ExecutionResult,
  type Executor,
} from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { buildStitchPlan, coerceOperationVariables } from './buildStitchPlan.js';
import { executeStitchPlan } from './executeStitchPlan.js';
import { projectDataToOperation } from './projectResult.js';
import { getOriginalRootResolve, installRootProxyingResolvers } from './rootProxyingResolvers.js';
import type { StitchPlan } from './types.js';

/** Full SDL introspection - schema execute (Hive also special-cases these). */
function isSchemaIntrospectionOperation(request: ExecutionRequest): boolean {
  for (const def of request.document.definitions) {
    if (def.kind !== Kind.OPERATION_DEFINITION) {
      continue;
    }
    for (const sel of def.selectionSet.selections) {
      if (sel.kind !== Kind.FIELD) {
        continue;
      }
      if (sel.name.value === '__schema' || sel.name.value === '__type') {
        return true;
      }
    }
  }
  return false;
}

function documentHasDeferOrStream(request: ExecutionRequest): boolean {
  for (const def of request.document.definitions) {
    if (def.kind !== Kind.OPERATION_DEFINITION && def.kind !== Kind.FRAGMENT_DEFINITION) {
      continue;
    }
    const stack = [...def.selectionSet.selections];
    while (stack.length) {
      const sel = stack.pop()!;
      if (
        'directives' in sel &&
        sel.directives?.some(d => d.name.value === 'defer' || d.name.value === 'stream')
      ) {
        return true;
      }
      if ((sel.kind === Kind.FIELD || sel.kind === Kind.INLINE_FRAGMENT) && sel.selectionSet) {
        stack.push(...sel.selectionSet.selections);
      }
    }
  }
  return false;
}

/**
 * Mutable plan/execute schema for one backbone executor. After `mapSchema` /
 * `onStitchedSchema`, `retargetBackboneToSchema` updates `schema` so Islands
 * see late root overrides without creating a new executor (progressive-
 * override options stay closed over).
 */
export type BackboneRuntime = {
  schema: GraphQLSchema;
  executor: Executor;
  /**
   * Pre-proxy root resolves keyed by `Type.field`, captured at first attach.
   * Restored after `mapSchema` when the ORIGINAL_RESOLVE symbol is dropped.
   */
  rootOriginals: Map<string, import('graphql').GraphQLFieldResolver<any, any>>;
  /** Swap the schema used for plan + Island resolve + introspection. */
  setSchema(next: GraphQLSchema): void;
};

const runtimeByExecutor = new WeakMap<Executor, BackboneRuntime>();

/** Runtime for an executor created by {@link createBackboneExecutor}, if any. */
export function getBackboneRuntime(executor: Executor): BackboneRuntime | undefined {
  return runtimeByExecutor.get(executor);
}

/**
 * Stitching backbone executor - plan once (cached) and run continuous
 * dataflow on Fetch/BatchFetch/Island/Condition. Subscriptions, SDL
 * introspection (`__schema` / `__type`), and @defer/@stream still use schema
 * execute (schema subscribe / incremental) until those are planned end-to-end.
 * Pure `{ __typename }` is an Island on the backbone.
 *
 * Progressive-override inputs are closed over from `stitchSchemas` options
 * (not stored on shared `stitchingInfo`).
 */
export function createBackboneExecutor(
  schema: GraphQLSchema,
  options?: {
    overrideLabels?: Iterable<string>;
    handleProgressiveOverride?: (label: string, context: any) => boolean | Promise<boolean>;
  },
): Executor {
  let activeSchema = schema;
  let schemaExecutor = createDefaultExecutor(activeSchema);
  /** Bumped on setSchema so plan cache does not reuse pre-override plans. */
  let schemaGeneration = 0;
  const planCache = new WeakMap<ExecutionRequest['document'], Map<string | null, StitchPlan>>();
  const overrideLabels = options?.overrideLabels;
  const handleProgressiveOverride = options?.handleProgressiveOverride;

  function stitchingBackboneExecutor(request: ExecutionRequest) {
    const operation = getOperationASTFromRequest(request);

    // Schema-execute paths (not yet planned end-to-end on the backbone).
    if (
      isSchemaIntrospectionOperation(request) ||
      (operation && operation.operation === 'subscription') ||
      documentHasDeferOrStream(request)
    ) {
      return schemaExecutor(request);
    }

    const plan = getCachedPlan(request);
    const op = operation ?? plan.operation;
    const coerced = coerceOperationVariables(op, request.variables ?? {});
    const requestWithCoercedVars: ExecutionRequest = {
      ...request,
      variables: coerced,
    };

    if (plan.incomplete) {
      return {
        data: null,
        errors: [
          new GraphQLError(
            `Incomplete stitch plan: ${plan.incompleteReasons.join('; ') || 'unknown'}`,
            { extensions: { code: 'INCOMPLETE_STITCH_PLAN' } },
          ),
        ],
      };
    }

    // Snapshot so a concurrent setSchema (retarget) cannot project with a
    // different schema than the one used to execute this request.
    const executionSchema = activeSchema;
    return handleMaybePromise(
      () => executeStitchPlan(executionSchema, plan, requestWithCoercedVars),
      (result: ExecutionResult) => {
        if (isAsyncIterable(result)) {
          return result;
        }
        return {
          ...result,
          data: projectDataToOperation(
            executionSchema,
            op,
            plan.fragments,
            coerced,
            result.data as any,
          ) as any,
        };
      },
    );
  }

  // Root proxying resolvers: stock graphql-js execute -> this executor.
  // `attachBackboneExecutor` records it per schema (WeakMap).
  installRootProxyingResolvers(activeSchema, request => stitchingBackboneExecutor(request));

  const rootOriginals = new Map<string, GraphQLFieldResolver<any, any>>();
  for (const root of [activeSchema.getQueryType(), activeSchema.getMutationType()]) {
    if (!root || !isObjectType(root)) {
      continue;
    }
    for (const [fieldName, field] of Object.entries(root.getFields())) {
      const original = getOriginalRootResolve(field);
      if (original) {
        rootOriginals.set(`${root.name}.${fieldName}`, original);
      }
    }
  }

  const runtime: BackboneRuntime = {
    get schema() {
      return activeSchema;
    },
    set schema(next: GraphQLSchema) {
      activeSchema = next;
      schemaExecutor = createDefaultExecutor(next);
      schemaGeneration++;
    },
    executor: stitchingBackboneExecutor,
    rootOriginals,
    setSchema(next: GraphQLSchema) {
      activeSchema = next;
      schemaExecutor = createDefaultExecutor(next);
      schemaGeneration++;
    },
  };
  runtimeByExecutor.set(stitchingBackboneExecutor, runtime);

  function getCachedPlan(request: ExecutionRequest): StitchPlan {
    const operation = getOperationASTFromRequest(request);
    if (!operation) {
      return {
        operation: operation as any,
        fragments: {},
        root: { kind: 'Parallel', nodes: [] },
        incomplete: true,
        incompleteReasons: ['Missing operation'],
      };
    }
    const fragments = getFragmentsFromDocument(request.document);
    const coerced = coerceOperationVariables(operation, request.variables ?? {});
    // Condition nodes -> one plan per document (no per-variable specialization).
    let overrideKey = '';
    // Percent overrides roll RNG inside fieldConfig.override at plan time -
    // never cache those plans (random cache keys would grow the Map forever).
    const hasPercentOverride =
      overrideLabels != null && [...overrideLabels].some(l => l.startsWith('percent('));
    if (overrideLabels && request.context != null && !hasPercentOverride) {
      if (handleProgressiveOverride) {
        const enabled: string[] = [];
        for (const label of overrideLabels) {
          try {
            const on = handleProgressiveOverride(label, request.context);
            if (on === true) {
              enabled.push(label);
            }
          } catch {
            // ignore async/throwing handlers for cache key
          }
        }
        overrideKey += `::ov:${enabled.sort().join(',')}`;
      }
    }
    // Bust plan cache when the active schema is retargeted (late overrides).
    const cacheKey = (operation.name?.value ?? '') + overrideKey + `::s:${schemaGeneration}`;
    let byName = planCache.get(request.document);
    if (!hasPercentOverride && byName) {
      const cached = byName.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    let plan: StitchPlan;
    try {
      plan = buildStitchPlan(activeSchema, operation, fragments, coerced, {
        handleProgressiveOverride,
        overrideLabels,
        context: request.context,
      });
    } catch (err) {
      plan = {
        operation,
        fragments,
        root: { kind: 'Parallel', nodes: [] },
        incomplete: true,
        incompleteReasons: [err instanceof Error ? err.message : 'Plan build failed'],
      };
    }
    if (!hasPercentOverride) {
      if (!byName) {
        byName = new Map();
        planCache.set(request.document, byName);
      }
      byName.set(cacheKey, plan);
    }
    return plan;
  }

  return stitchingBackboneExecutor;
}
