import {
  GraphQLError,
  Kind,
  type DocumentNode,
  type GraphQLSchema,
  type OperationDefinitionNode,
} from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { getFragmentsFromDocument } from '@graphql-tools/executor';
import {
  getOperationASTFromRequest,
  isAsyncIterable,
  memoize1,
  memoize2,
  type ExecutionRequest,
  type ExecutionResult,
  type Executor,
} from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { buildStitchPlan, coerceOperationVariables } from './buildStitchPlan.js';
import { executeStitchPlan } from './executeStitchPlan.js';
import { projectDataToOperation } from './projectResult.js';
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

/** Same key fusion sets on request context with the per-request active labels. */
const OVERRIDE_LABELS_CONTEXT_KEY = Symbol.for('hive.gateway.overrideLabels');

/** When context has no active labels object — stable WeakMap key for memoize2. */
const EMPTY_ACTIVE_LABELS: object = Object.freeze({});

/**
 * Build inputs for the memoize2 miss path (fragments / vars / context are not
 * cache keys — same as the previous document+string-key cache).
 */
let planBuildInput:
  | {
      schema: GraphQLSchema;
      operation: OperationDefinitionNode;
      fragments: ReturnType<typeof getFragmentsFromDocument>;
      coerced: Record<string, any>;
      context: ExecutionRequest['context'];
    }
  | undefined;

/** Per-schema plan cache: memoize2(request.document, activeLabels). */
const getPlanMemoForSchema = memoize1(function getPlanMemoForSchema(_schema: GraphQLSchema) {
  return memoize2(function cachedPlanByDocumentAndLabels(
    _document: DocumentNode,
    _activeLabels: object,
  ): StitchPlan {
    const input = planBuildInput!;
    try {
      return buildStitchPlan(input.schema, input.operation, input.fragments, input.coerced, {
        context: input.context,
      });
    } catch (err) {
      return {
        operation: input.operation,
        fragments: input.fragments,
        root: { kind: 'Parallel', nodes: [] },
        incomplete: true,
        incompleteReasons: [err instanceof Error ? err.message : 'Plan build failed'],
      };
    }
  });
});

function buildPlanUncached(
  schema: GraphQLSchema,
  operation: OperationDefinitionNode,
  fragments: ReturnType<typeof getFragmentsFromDocument>,
  coerced: Record<string, any>,
  context: ExecutionRequest['context'],
): StitchPlan {
  try {
    return buildStitchPlan(schema, operation, fragments, coerced, { context });
  } catch (err) {
    return {
      operation,
      fragments,
      root: { kind: 'Parallel', nodes: [] },
      incomplete: true,
      incompleteReasons: [err instanceof Error ? err.message : 'Plan build failed'],
    };
  }
}

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
  const fragments = getFragmentsFromDocument(request.document);
  const coerced = coerceOperationVariables(operation, request.variables ?? {});
  // Per-request active labels only (fusion / gateway context) — no schema.extensions bag.
  const activeLabels = request.context?.[OVERRIDE_LABELS_CONTEXT_KEY] as
    (Iterable<string> & object) | undefined;
  const enabled = activeLabels != null ? [...activeLabels] : [];
  // percent(...) rolls RNG inside field override at plan time — never cache.
  if (enabled.some(l => l.startsWith('percent('))) {
    return buildPlanUncached(schema, operation, fragments, coerced, request.context);
  }
  const labelsKey: object =
    activeLabels != null && typeof activeLabels === 'object' ? activeLabels : EMPTY_ACTIVE_LABELS;
  planBuildInput = {
    schema,
    operation,
    fragments,
    coerced,
    context: request.context,
  };
  try {
    return getPlanMemoForSchema(schema)(request.document, labelsKey);
  } finally {
    planBuildInput = undefined;
  }
}

/**
 * Shared stitching backbone executor — no per-schema instance stored.
 * Schema: explicit `schema` arg, else `request.info.schema`. Plan / locals /
 * progressive-override come from that schema's stitchingInfo.
 */
export function backboneExecutor(
  request: ExecutionRequest,
  schema?: GraphQLSchema,
): ReturnType<Executor<Record<string, any>>> {
  const activeSchema = schema ?? request.info?.schema;
  if (activeSchema == null) {
    throw new GraphQLError(
      'backboneExecutor requires a schema (pass schema arg or request.info.schema)',
      { extensions: { code: 'BACKBONE_MISSING_SCHEMA' } },
    );
  }

  const operation = getOperationASTFromRequest(request);

  if (
    isSchemaIntrospectionOperation(request) ||
    (operation && operation.operation === 'subscription') ||
    documentHasDeferOrStream(request)
  ) {
    return createDefaultExecutor(activeSchema)(request);
  }

  const plan = getCachedPlan(activeSchema, request);
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
    () => executeStitchPlan(activeSchema, plan, requestWithCoercedVars),
    (result: ExecutionResult) => {
      if (isAsyncIterable(result)) {
        return result;
      }
      return {
        ...result,
        data: projectDataToOperation(
          activeSchema,
          op,
          plan.fragments,
          coerced,
          result.data as any,
        ) as any,
      };
    },
  );
}

/**
 * Schema-bound {@link backboneExecutor} (memoized per schema). Calls
 * `backboneExecutor(request, schema)` — does not mutate `info.schema`.
 * Does not install root proxies — call {@link attachBackboneExecutor} /
 * `stitchSchemas` for that.
 */
export const getBackboneExecutorBySchema = memoize1(function getBackboneExecutorBySchema(
  schema: GraphQLSchema,
): Executor {
  return ((request: ExecutionRequest) => backboneExecutor(request, schema)) as Executor;
});
