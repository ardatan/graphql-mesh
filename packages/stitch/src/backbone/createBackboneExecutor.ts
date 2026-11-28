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

type ProgressiveOverrideHandler = (label: string, context: any) => boolean | Promise<boolean>;

function readProgressiveOverride(schema: GraphQLSchema): {
  overrideLabels?: Iterable<string>;
  handleProgressiveOverride?: ProgressiveOverrideHandler;
} {
  const ext = schema.extensions ?? {};
  return {
    overrideLabels: ext.overrideLabels as Iterable<string> | undefined,
    handleProgressiveOverride: ext.handleProgressiveOverride as
      | ProgressiveOverrideHandler
      | undefined,
  };
}

/** Plan cache keyed by schema; entries by operation AST (stable across proxy rebuilds). */
const planCacheBySchema = new WeakMap<
  GraphQLSchema,
  WeakMap<object, Map<string | null, StitchPlan>>
>();

function getCachedPlan(schema: GraphQLSchema, request: ExecutionRequest): StitchPlan {
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
  const { overrideLabels, handleProgressiveOverride } = readProgressiveOverride(schema);
  const fragments = getFragmentsFromDocument(request.document);
  const coerced = coerceOperationVariables(operation, request.variables ?? {});
  let overrideKey = '';
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
  // Root proxies rebuild `document` each call but keep `info.operation` as the
  // extracted op — key by that stable node. Delegated requests share the outer
  // `info.operation` while carrying a different extracted op; key by document.
  const planKey: object =
    request.info?.operation != null && request.info.operation === operation
      ? request.info.operation
      : request.document;
  let planCache = planCacheBySchema.get(schema);
  if (!planCache) {
    planCache = new WeakMap();
    planCacheBySchema.set(schema, planCache);
  }
  let byName = planCache.get(planKey);
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
      planCache.set(planKey, byName);
    }
    byName.set(cacheKey, plan);
  }
  return plan;
}

/**
 * Shared stitching backbone executor — no per-schema instance stored.
 * Plan / locals / progressive-override come from `request.info.schema`
 * (stitchingInfo on that schema). Root proxies pass `info`;
 * {@link getBackboneExecutor} injects a schema-bearing info when absent.
 */
export const backboneExecutor: Executor = function backboneExecutor(request: ExecutionRequest) {
  const schema = request.info?.schema;
  if (schema == null) {
    return {
      data: null,
      errors: [
        new GraphQLError(
          'backboneExecutor requires request.info.schema (use getBackboneExecutor(schema) or root proxies)',
          { extensions: { code: 'BACKBONE_MISSING_SCHEMA' } },
        ),
      ],
    };
  }

  const operation = getOperationASTFromRequest(request);

  if (
    isSchemaIntrospectionOperation(request) ||
    (operation && operation.operation === 'subscription') ||
    documentHasDeferOrStream(request)
  ) {
    return createDefaultExecutor(schema)(request);
  }

  const plan = getCachedPlan(schema, request);
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
};

/**
 * Derive an executor for `schema` without storing one on the schema.
 * Always plans against the bound schema — callers may pass outer-gateway
 * `info` when this schema is used as a nested subschema executor.
 */
export function getBackboneExecutor(schema: GraphQLSchema): Executor {
  return function schemaBoundBackboneExecutor(request: ExecutionRequest) {
    if (request.info?.schema === schema) {
      return backboneExecutor(request);
    }
    return backboneExecutor({
      ...request,
      info: {
        ...(request.info as object | undefined),
        schema,
      } as NonNullable<ExecutionRequest['info']>,
    });
  };
}

export type BackboneAttachOptions = {
  overrideLabels?: Iterable<string>;
  handleProgressiveOverride?: ProgressiveOverrideHandler;
};

/**
 * Stash progressive-override inputs on `schema.extensions` and install shared
 * root proxies that call {@link backboneExecutor} with `info.schema`.
 * Does not create or store a per-schema Executor instance.
 */
export function attachBackboneExecutor(
  schema: GraphQLSchema,
  options?: BackboneAttachOptions,
): GraphQLSchema {
  const overrideLabels =
    options?.overrideLabels ?? (schema.extensions?.overrideLabels as Iterable<string> | undefined);
  const handleProgressiveOverride =
    options?.handleProgressiveOverride ??
    (schema.extensions?.handleProgressiveOverride as ProgressiveOverrideHandler | undefined);
  if (overrideLabels != null || handleProgressiveOverride != null) {
    schema.extensions = {
      ...schema.extensions,
      ...(overrideLabels != null ? { overrideLabels } : {}),
      ...(handleProgressiveOverride != null ? { handleProgressiveOverride } : {}),
    };
  }
  installRootProxyingResolvers(schema, backboneExecutor);
  return schema;
}

/**
 * Convenience for tests: attach shared proxies and return a schema-bound
 * {@link getBackboneExecutor} wrapper.
 */
export function createBackboneExecutor(
  schema: GraphQLSchema,
  options?: BackboneAttachOptions,
): Executor {
  attachBackboneExecutor(schema, options);
  return getBackboneExecutor(schema);
}
