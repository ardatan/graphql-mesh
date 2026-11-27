import {
  GraphQLError,
  Kind,
  getVariableValues as schemaGetVariableValues,
  type GraphQLSchema,
  type OperationDefinitionNode,
} from 'graphql';
import { createDefaultExecutor, getCoercedVariableValues } from '@graphql-tools/delegate';
import { getFragmentsFromDocument } from '@graphql-tools/executor';
import {
  getOperationASTFromRequest,
  isAsyncIterable,
  type ExecutionRequest,
  type ExecutionResult,
  type Executor,
} from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { coerceGetVariableValuesResult } from '../variableValues.js';
import { buildStitchPlan, coerceOperationVariables } from './buildStitchPlan.js';
import { executeStitchPlan } from './executeStitchPlan.js';
import { projectDataToOperation } from './projectResult.js';
import {
  BACKBONE_VARIABLES_ALREADY_COERCED,
  installRootProxyingResolvers,
} from './rootProxyingResolvers.js';
import type { BackboneExecutorOptions, StitchPlan } from './types.js';

/**
 * Schema-aware coercion for **direct** backbone entry (Hive Gateway executor).
 * Uses GraphQL Tools helpers for dual GQL16/17 shapes
 * (`coerceGetVariableValuesResult` + `getCoercedVariableValues`).
 * On failure → errors, zero hops. Skip when already marked coerced (trampoline).
 */
function schemaCoerceRequestVariables(
  schema: GraphQLSchema,
  operation: OperationDefinitionNode,
  rawVariables: Record<string, unknown> | null | undefined,
): { variables: Record<string, any>; errors?: readonly GraphQLError[] } {
  const raw = schemaGetVariableValues(
    schema,
    operation.variableDefinitions ?? [],
    rawVariables ?? {},
    { maxErrors: 50 },
  );
  const normalized = coerceGetVariableValuesResult(raw);
  if ('errors' in normalized) {
    return { variables: {}, errors: normalized.errors };
  }
  const variables = {
    ...(getCoercedVariableValues(normalized.variableValues) ?? {}),
  };
  for (const key of Object.keys(variables)) {
    if (variables[key] === undefined) {
      delete variables[key];
    }
  }
  return { variables };
}

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
 */
export function createBackboneExecutor(
  schema: GraphQLSchema,
  options: BackboneExecutorOptions = {},
): Executor {
  const schemaExecutor = createDefaultExecutor(schema);
  const planCache = new WeakMap<ExecutionRequest['document'], Map<string | null, StitchPlan>>();

  // Root proxying resolvers: stock graphql-js execute -> this executor. Prefer
  // `attachBackboneExecutor` so the executor also lands on schema.extensions;
  // safe to call again after mapSchema on the final schema object.
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
      options.overrideLabels != null &&
      [...options.overrideLabels].some(l => l.startsWith('percent('));
    if (options.overrideLabels && request.context != null && !hasPercentOverride) {
      if (options.handleProgressiveOverride) {
        const enabled: string[] = [];
        for (const label of options.overrideLabels) {
          try {
            const on = options.handleProgressiveOverride(label, request.context);
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
        handleProgressiveOverride: options.handleProgressiveOverride,
        overrideLabels: options.overrideLabels,
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

    // Variables: coerce once at the true entry.
    // - Direct executor (Hive Gateway): schema getVariableValues here.
    // - graphql-js trampoline (root proxies): already coerced + marked
    //   BACKBONE_VARIABLES_ALREADY_COERCED - defaults-only, no re-coerce.
    const op = operation;
    const alreadyCoerced = (request as any)[BACKBONE_VARIABLES_ALREADY_COERCED] === true;
    let coerced: Record<string, any>;
    if (op && !alreadyCoerced) {
      const validated = schemaCoerceRequestVariables(schema, op, request.variables ?? {});
      if (validated.errors != null) {
        return { data: null, errors: [...validated.errors] };
      }
      coerced = validated.variables;
    } else if (op) {
      coerced = coerceOperationVariables(op, request.variables ?? {});
    } else {
      coerced = { ...(request.variables ?? {}) };
    }
    const requestWithVars: ExecutionRequest = {
      ...request,
      variables: coerced,
    };
    // Do not re-coerce on hops; mark so nested/re-entrant paths stay flat.
    (requestWithVars as any)[BACKBONE_VARIABLES_ALREADY_COERCED] = true;

    const plan = getCachedPlan(requestWithVars);
    const planOp = op ?? plan.operation;

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
      () => executeStitchPlan(schema, plan, requestWithVars),
      (result: ExecutionResult) => {
        if (isAsyncIterable(result)) {
          return result;
        }
        return {
          ...result,
          data: projectDataToOperation(
            schema,
            planOp,
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
