import {
  defaultFieldResolver,
  isObjectType,
  Kind,
  type GraphQLError,
  type GraphQLFieldResolver,
  type GraphQLSchema,
  type SelectionNode,
} from 'graphql';
import { annotateExternalObject, UNPATHED_ERRORS_SYMBOL } from '@graphql-tools/delegate';
import { CRITICAL_ERROR } from '@graphql-tools/executor';
import type { ExecutionRequest, Executor } from '@graphql-tools/utils';
import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';

const PROXYING_INSTALLED = Symbol.for('graphql-tools.stitch.backboneRootProxying');

/** Set on context while backbone execute runs so root Islands skip proxying. */
export const BACKBONE_EXECUTING = Symbol.for('graphql-tools.stitch.backboneExecuting');

const ORIGINAL_RESOLVE = Symbol.for('graphql-tools.stitch.backboneOriginalResolve');

function selectionHasDeferOrStream(selections: readonly SelectionNode[]): boolean {
  const stack = [...selections];
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
  return false;
}

function fieldErrorsForKey(
  errors: ReadonlyArray<GraphQLError> | undefined,
  responseKey: string | number,
): GraphQLError[] {
  if (!errors?.length) {
    return [];
  }
  return errors.filter(error => !error.path?.length || error.path[0] === responseKey);
}

/**
 * Surface backbone plan errors through stock graphql-js field resolution:
 * - null field value -> throw (graphql-js nulls + records the error)
 * - partial object -> stamp UNPATHED_ERRORS so nested merged resolvers report
 *   them via resolveExternalValue (classic parity)
 */
function applyBackboneResult(
  result: { data?: Record<string, any> | null; errors?: GraphQLError[] } | null,
  responseKey: string | number,
): any {
  const value = result?.data?.[responseKey as string];
  const fieldErrors = fieldErrorsForKey(result?.errors, responseKey);
  if (fieldErrors.length && value == null) {
    if (fieldErrors.length === 1) {
      throw fieldErrors[0];
    }
    throw new AggregateError(fieldErrors, fieldErrors.map(e => e.message).join(',\n'));
  }
  if (fieldErrors.length && value != null && typeof value === 'object' && !Array.isArray(value)) {
    const clientErrors = fieldErrors.filter(error => !error.extensions?.[CRITICAL_ERROR]);
    if (clientErrors.length) {
      const existing = (value as any)[UNPATHED_ERRORS_SYMBOL] as GraphQLError[] | undefined;
      if (existing?.length) {
        existing.push(...clientErrors);
      } else {
        annotateExternalObject(value, clientErrors, undefined, Object.create(null));
      }
    }
  }
  return value;
}

/**
 * Install root Query/Mutation proxying resolvers so stock graphql-js `execute`
 * proxies once into the backbone plan, then returns cached root values -
 * same idea as wrapSchema's proxying resolvers, but the target is the
 * backbone executor rather than a single subgraph.
 * Subscription roots are left alone (schema subscribe / backbone schema path).
 */
export function installRootProxyingResolvers(schema: GraphQLSchema, runBackbone: Executor): void {
  // Idempotent re-attach: after mapSchema / option changes, rebind proxying
  // to the new executor without nesting (always wrap the pre-proxy resolve).
  (schema as any)[PROXYING_INSTALLED] = true;

  const CONTEXT_PLAN_RESULT = Symbol('backboneRootProxyResult');
  const CONTEXT_PLAN_PROMISE = Symbol('backboneRootProxyPromise');

  for (const op of ['query', 'mutation'] as const) {
    const rootType = op === 'query' ? schema.getQueryType() : schema.getMutationType();
    if (!rootType || !isObjectType(rootType)) {
      continue;
    }
    const fields = rootType.getFields();
    for (const fieldName of Object.keys(fields)) {
      const field = fields[fieldName]!;
      const previousResolve: GraphQLFieldResolver<any, any> =
        (field as any)[ORIGINAL_RESOLVE] ?? field.resolve ?? defaultFieldResolver;
      (field as any)[ORIGINAL_RESOLVE] = previousResolve;
      field.resolve = function backboneRootProxyingResolver(root, args, context, info) {
        // @defer/@stream: classic incremental execute. The backbone executor
        // falls back to schemaExecutor for these, which would re-enter this
        // proxy and recurse forever if we ran the plan here.
        if (
          info?.operation?.selectionSet &&
          (selectionHasDeferOrStream(info.operation.selectionSet.selections) ||
            Object.values(info.fragments ?? {}).some(f =>
              selectionHasDeferOrStream(f.selectionSet.selections),
            ))
        ) {
          return previousResolve(root, args, context, info);
        }
        if (context == null || typeof context !== 'object') {
          return previousResolve(root, args, context, info);
        }
        const responseKey = info.path.key;

        // Share one plan across sibling roots. Never fall through to classic
        // proxying while a plan is in flight - that re-delegates e.g.
        // topProducts and schedules a duplicate inventory mergeFields hop.
        // Root Islands call getOriginalRootResolve() so they do not hit this.
        const cached = (context as any)[CONTEXT_PLAN_RESULT];
        if (cached != null) {
          return applyBackboneResult(cached, responseKey);
        }

        let pending = (context as any)[CONTEXT_PLAN_PROMISE] as MaybePromise<any> | undefined;
        if (!pending) {
          const request: ExecutionRequest = {
            document: {
              kind: Kind.DOCUMENT,
              definitions: [info.operation, ...Object.values(info.fragments ?? {})],
            },
            variables: info.variableValues ?? {},
            context,
            rootValue: root,
            operationName: info.operation.name?.value,
          };
          // Sync backbone results stay sync (fakePromise) - no Promise.resolve
          // microtask. Share one MaybePromise across sibling root fields.
          pending = handleMaybePromise(
            () => runBackbone(request),
            result => {
              (context as any)[CONTEXT_PLAN_RESULT] = result;
              return result;
            },
          );
          (context as any)[CONTEXT_PLAN_PROMISE] = pending;
        }
        return handleMaybePromise(
          () => pending,
          result => applyBackboneResult(result, responseKey),
        );
      };
    }
  }
}

/** Original root resolver before backbone proxying (for tests / debugging). */
export function getOriginalRootResolve(field: {
  resolve?: GraphQLFieldResolver<any, any>;
}): GraphQLFieldResolver<any, any> | undefined {
  return (field as any)[ORIGINAL_RESOLVE];
}
