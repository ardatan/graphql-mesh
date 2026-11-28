import { GraphQLError, Kind, type DocumentNode, type GraphQLSchema } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { getFragmentsFromDocument } from '@graphql-tools/executor';
import {
  getOperationASTFromRequest,
  isAsyncIterable,
  memoize1,
  type ExecutionRequest,
  type ExecutionResult,
  type Executor,
} from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { buildStitchPlan } from './buildStitchPlan.js';
import { executeStitchPlan } from './executeStitchPlan.js';
import { projectDataToOperation } from './projectResult.js';
import { ensureVariableValue } from './runIf.js';
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

/** schema → document → Map keyed by `${operationName}::${sortedLabels}`. */
const plansBySchema = new WeakMap<GraphQLSchema, WeakMap<DocumentNode, Map<string, StitchPlan>>>();

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
  const activeLabelsRaw = request.context?.[OVERRIDE_LABELS_CONTEXT_KEY];
  const activeLabels: Iterable<string> | undefined =
    activeLabelsRaw != null && typeof (activeLabelsRaw as any)[Symbol.iterator] === 'function'
      ? (activeLabelsRaw as Iterable<string>)
      : undefined;
  const operationName = request.operationName ?? '';
  const sortedLabels = activeLabels != null ? [...activeLabels].map(String).sort().join(',') : '';
  const key = `${operationName}::${sortedLabels}`;

  let byDocument = plansBySchema.get(schema);
  if (!byDocument) {
    byDocument = new WeakMap();
    plansBySchema.set(schema, byDocument);
  }
  let cache = byDocument.get(request.document);
  if (!cache) {
    cache = new Map();
    byDocument.set(request.document, cache);
  }
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  const fragments = getFragmentsFromDocument(request.document);
  const plan = buildStitchPlan(schema, operation, fragments, activeLabels);
  cache.set(key, plan);
  return plan;
}

/**
 * Shared stitching backbone executor — no per-schema instance stored.
 * Schema: explicit `schema` arg, else `request.info.schema`. Plan / locals /
 * progressive-override come from that schema's stitchingInfo.
 */
export function executor(
  request: ExecutionRequest,
  schema?: GraphQLSchema,
): ReturnType<Executor<Record<string, any>>> {
  const activeSchema = schema ?? request.info?.schema;
  if (activeSchema == null) {
    throw new GraphQLError('executor requires a schema (pass schema arg or request.info.schema)', {
      extensions: { code: 'BACKBONE_MISSING_SCHEMA' },
    });
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
    () => executeStitchPlan(activeSchema, plan, request),
    (result: ExecutionResult) => {
      if (isAsyncIterable(result)) {
        return result;
      }
      // Projection @skip/@include: fill missing vars from plan defaults on demand.
      const variables: Record<string, any> = { ...(request.variables ?? {}) };
      for (const key of Object.keys(variables)) {
        if (variables[key] === undefined) {
          delete variables[key];
        }
      }
      for (const name of Object.keys(plan.variableDefaults ?? {})) {
        ensureVariableValue(variables, name, plan.variableDefaults);
      }
      return {
        ...result,
        data: projectDataToOperation(
          activeSchema,
          op,
          plan.fragments,
          variables,
          result.data as any,
        ) as any,
      };
    },
  );
}

/**
 * Schema-bound {@link executor} (memoized per schema). Calls
 * `executor(request, schema)` — does not mutate `info.schema`.
 * Does not install root proxies — call {@link installRootProxyingResolvers} /
 * `stitchSchemas` for that.
 */
export const getBackboneExecutorBySchema = memoize1(function getBackboneExecutorBySchema(
  schema: GraphQLSchema,
): Executor {
  return ((request: ExecutionRequest) => executor(request, schema)) as Executor;
});
