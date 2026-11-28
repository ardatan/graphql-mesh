import {
  defaultFieldResolver,
  isObjectType,
  Kind,
  type DocumentNode,
  type FragmentDefinitionNode,
  type GraphQLError,
  type GraphQLFieldResolver,
  type GraphQLSchema,
  type OperationDefinitionNode,
  type SelectionNode,
} from 'graphql';
import {
  annotateExternalObject,
  getCoercedVariableValues,
  UNPATHED_ERRORS_SYMBOL,
} from '@graphql-tools/delegate';
import { CRITICAL_ERROR } from '@graphql-tools/executor';
import { memoize2, type ExecutionRequest } from '@graphql-tools/utils';
import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import { executor } from './executor.js';

/** Set on context while backbone execute runs so root Islands skip proxying. */
export const BACKBONE_EXECUTING = Symbol.for('graphql-tools.stitch.backboneExecuting');

/** Schemas that already have root proxying installed (no schema mutation). */
const schemasWithRootProxying = new WeakSet<GraphQLSchema>();
/** Resolve fns installed by {@link installRootProxyingResolvers} (no fn mutation). */
const backboneRootProxies = new WeakSet<object>();
/** Pre-proxy root resolve for Islands — keyed by field object, no field mutation. */
const originalResolveByField = new WeakMap<object, GraphQLFieldResolver<any, any>>();

/** Per-request plan result/promise — keyed by context, no context mutation. */
const planResultByContext = new WeakMap<object, any>();
const planPromiseByContext = new WeakMap<object, MaybePromise<any>>();

/** Stable empty fragments map for memoize2 when `info.fragments` is absent. */
const EMPTY_FRAGMENTS: Record<string, FragmentDefinitionNode> = Object.freeze({});

/**
 * Stable document per (operation, fragments) so plan cache can key by
 * `request.document` (root proxies used to rebuild a fresh Document every call).
 */
const memoizedRootProxyDocument = memoize2(function memoizedRootProxyDocument(
  operation: OperationDefinitionNode,
  fragments: Record<string, FragmentDefinitionNode>,
): DocumentNode {
  return {
    kind: Kind.DOCUMENT,
    definitions: [operation, ...Object.values(fragments)],
  };
});

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
 * proxies once into the shared {@link executor}, then returns cached
 * root values — same idea as wrapSchema's proxying resolvers, but the target
 * is the backbone rather than a single subgraph.
 * Subscription roots are left alone (schema subscribe / backbone schema path).
 * Does not store a per-schema Executor.
 */
export function installRootProxyingResolvers(schema: GraphQLSchema): GraphQLSchema {
  // Attach-once after filter / onStitchedSchema. External post-stitch mapSchema
  // is unsupported — original resolve lives in a WeakMap for Islands.
  if (schemasWithRootProxying.has(schema)) {
    return schema;
  }
  schemasWithRootProxying.add(schema);

  for (const op of ['query', 'mutation'] as const) {
    const rootType = op === 'query' ? schema.getQueryType() : schema.getMutationType();
    if (!rootType || !isObjectType(rootType)) {
      continue;
    }
    const fields = rootType.getFields();
    for (const fieldName of Object.keys(fields)) {
      const field = fields[fieldName]!;
      const resolveFn = field.resolve ?? defaultFieldResolver;
      // Already proxied — do not nest (would recurse when Islands call original).
      if (typeof resolveFn === 'function' && backboneRootProxies.has(resolveFn)) {
        continue;
      }
      const previousResolve: GraphQLFieldResolver<any, any> = resolveFn;
      originalResolveByField.set(field, previousResolve);
      // Context is always an object (graphql-js execute) — type it for WeakMap keys.
      const proxy: GraphQLFieldResolver<any, object> = function backboneRootProxyingResolver(
        root,
        args,
        context,
        info,
      ) {
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
        const responseKey = info.path.key;

        // Share one plan across sibling roots. Never fall through to classic
        // proxying while a plan is in flight - that re-delegates e.g.
        // topProducts and schedules a duplicate inventory mergeFields hop.
        // Root Islands call getOriginalRootResolve() so they do not hit this.
        const cached = planResultByContext.get(context);
        if (cached != null) {
          return applyBackboneResult(cached, responseKey);
        }

        let pending = planPromiseByContext.get(context);
        if (!pending) {
          // GraphQL 17: info.variableValues is `{ coerced, sources }` — unwrap
          // so File/upload scalars and other runtime values reach subgraphs
          // (same as classic delegate/createRequest).
          const request: ExecutionRequest = {
            document: memoizedRootProxyDocument(info.operation, info.fragments ?? EMPTY_FRAGMENTS),
            variables: getCoercedVariableValues(info.variableValues) ?? {},
            context,
            rootValue: root,
            operationName: info.operation.name?.value,
            // Shared executor: omit schema → request.info.schema.
            info,
          };
          // Sync backbone results stay sync (fakePromise) - no Promise.resolve
          // microtask. Share one MaybePromise across sibling root fields.
          pending = handleMaybePromise(
            () => executor(request),
            result => {
              planResultByContext.set(context, result);
              return result;
            },
          );
          planPromiseByContext.set(context, pending);
        }
        return handleMaybePromise(
          () => pending,
          result => applyBackboneResult(result, responseKey),
        );
      };
      backboneRootProxies.add(proxy);
      field.resolve = proxy;
    }
  }
  return schema;
}

/** Original root resolver before backbone proxying (Island local). */
export function getOriginalRootResolve(field: {
  resolve?: GraphQLFieldResolver<any, any>;
}): GraphQLFieldResolver<any, any> | undefined {
  return originalResolveByField.get(field);
}
