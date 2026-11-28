import { GraphQLError, Kind, type GraphQLSchema } from 'graphql';
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
import { installRootProxyingResolvers } from './rootProxyingResolvers.js';
import type { StitchPlan } from './types.js';

/** Progressive-override inputs closed over at create/attach time. */
export type BackboneExecutorOptions = {
  overrideLabels?: Iterable<string>;
  handleProgressiveOverride?: (label: string, context: any) => boolean | Promise<boolean>;
};

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
 * Stitching backbone executor - plan once (cached) and run continuous
 * dataflow on Fetch/BatchFetch/Island/Condition. Subscriptions, SDL
 * introspection (`__schema` / `__type`), and @defer/@stream still use schema
 * execute (schema subscribe / incremental) until those are planned end-to-end.
 * Pure `{ __typename }` is an Island on the backbone.
 *
 * Progressive-override inputs are closed over from `options` (passed by
 * `stitchSchemas` / federation attach), not read from shared `stitchingInfo`.
 */
export function createBackboneExecutor(
  schema: GraphQLSchema,
  options?: BackboneExecutorOptions,
): Executor {
  const schemaExecutor = createDefaultExecutor(schema);
  const planCache = new WeakMap<ExecutionRequest['document'], Map<string | null, StitchPlan>>();
  const overrideLabels = options?.overrideLabels;
  const handleProgressiveOverride = options?.handleProgressiveOverride;

  // Root proxying resolvers: stock graphql-js execute -> this executor. Prefer
  // `attachBackboneExecutor` so the executor is recorded per schema instance.
  // Safe to call again after a schema-changing filter on the final schema.
  installRootProxyingResolvers(schema, request => stitchingBackboneExecutor(request));

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
    const cacheKey = (operation.name?.value ?? '') + overrideKey;
    let byName = planCache.get(request.document);
    if (!hasPercentOverride && byName) {
      const cached = byName.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    let plan: StitchPlan;
    try {
      plan = buildStitchPlan(schema, operation, fragments, coerced, {
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

    return handleMaybePromise(
      () => executeStitchPlan(schema, plan, requestWithCoercedVars),
      (result: ExecutionResult) => {
        if (isAsyncIterable(result)) {
          return result;
        }
        return {
          ...result,
          data: projectDataToOperation(
            schema,
            op,
            plan.fragments,
            coerced,
            result.data as any,
          ) as any,
        };
      },
    );
  }

  return stitchingBackboneExecutor;
}
