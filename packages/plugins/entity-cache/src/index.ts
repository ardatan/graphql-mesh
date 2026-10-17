import {
  getOperationAST,
  Kind,
  type ExecutionResult,
  type GraphQLSchema,
  type SelectionSetNode,
} from 'graphql';
import type { GatewayPlugin } from '@graphql-hive/gateway-runtime';
import type { Executor } from '@graphql-tools/utils';
import { EntityInvalidationInputError, validateEntityInvalidation } from './events.js';
import { executeMixedEntityBatch } from './mixed.js';
import { hash, planEntityBatch } from './plan.js';
import { MAX_ENTITY_TTL_SECONDS } from './policy.js';
import type { EntityCacheMetrics, EntityInvalidation, EntityRule, EntityStore } from './types.js';

export { EntityInvalidationInputError } from './events.js';
export type * from './types.js';
export { planEntityBatch } from './plan.js';
export {
  MAX_ENTITY_TTL_SECONDS,
  ENTITY_FENCE_TTL_SECONDS,
  ENTITY_REPLAY_TTL_SECONDS,
  MAX_ENTITY_ENTRY_BYTES,
} from './policy.js';

const iterable = (value: unknown): value is AsyncIterable<unknown> =>
  !!value && typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function';
const FALLBACK = Symbol('fallback');
type Rows = unknown[] | typeof FALLBACK;

// #9658: executor wrapping covers resolveTo batches and merged-type delegation without source assumptions.
export function createEntityCache({
  store,
  rules,
  timeoutMs = 100,
  maxPending = 10_000,
  now = Date.now,
}: {
  store: EntityStore;
  rules: EntityRule[];
  timeoutMs?: number;
  maxPending?: number;
  now?: () => number;
}) {
  // #9658: reject unbounded coalescing and timer overflow before installing the executor hook.
  if (!Number.isSafeInteger(maxPending) || maxPending < 0)
    throw new Error('invalid entity maxPending');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647)
    throw new Error('invalid entity timeout');
  for (const rule of rules) {
    if (
      rule.maxBatchSize !== undefined &&
      (!Number.isSafeInteger(rule.maxBatchSize) || rule.maxBatchSize <= 0)
    )
      throw new Error('invalid entity maxBatchSize');
    if (
      !Number.isFinite(rule.ttlSeconds) ||
      rule.ttlSeconds <= 0 ||
      rule.ttlSeconds > MAX_ENTITY_TTL_SECONDS
    )
      throw new Error('entity ttl must be within 1..86400 seconds');
    if (
      rule.negativeTtlSeconds !== undefined &&
      (!Number.isFinite(rule.negativeTtlSeconds) ||
        rule.negativeTtlSeconds <= 0 ||
        rule.negativeTtlSeconds > rule.ttlSeconds)
    )
      throw new Error('negative ttl must not exceed entity ttl');
  }
  const metrics: EntityCacheMetrics = {
    hits: 0,
    misses: 0,
    coalesced: 0,
    upstreamCalls: 0,
    writes: 0,
    fencedWrites: 0,
    admissionRejected: 0,
    invalidations: 0,
    cacheErrors: 0,
    bypasses: 0,
  };
  const pending = new Map<string, Promise<Rows>>();
  // A failed mutation fence makes this process bypass for the entire maximum row TTL.
  let bypassUntil = 0;
  const bounded = async <T>(run: () => Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        run(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('entity cache timeout')), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  const invalidate = async (input: EntityInvalidation) => {
    validateEntityInvalidation(input);
    if (!rules.some(r => r.source === input.source && r.entityType === input.entityType))
      throw new EntityInvalidationInputError('unknown entity source or type');
    const partition = hash([input.source, input.entityType, input.scope]);
    try {
      await bounded(() =>
        store.invalidate(
          partition,
          input.identities && [...new Set(input.identities)],
          input.event,
        ),
      );
      metrics.invalidations++;
    } catch (error) {
      metrics.cacheErrors++;
      bypassUntil = now() + Math.max(...rules.map(r => r.ttlSeconds)) * 1000;
      throw error;
    }
  };
  const wrap =
    (executor: Executor, source: string, schema: GraphQLSchema): Executor =>
    async request => {
      // #9658: mutation fences follow the selected operation, including a named second definition.
      const operation = getOperationAST(request.document, request.operationName);
      if (operation?.kind === Kind.OPERATION_DEFINITION && operation.operation === 'mutation') {
        const fields = new Set<string>();
        const expanded = new Set<string>();
        const collect = (set: SelectionSetNode) => {
          for (const node of set.selections) {
            if (node.kind === Kind.FIELD) fields.add(node.name.value);
            else if (node.kind === Kind.INLINE_FRAGMENT) collect(node.selectionSet);
            else if (!expanded.has(node.name.value)) {
              expanded.add(node.name.value);
              const fragment = request.document.definitions.find(
                d => d.kind === Kind.FRAGMENT_DEFINITION && d.name.value === node.name.value,
              );
              if (fragment?.kind === Kind.FRAGMENT_DEFINITION) collect(fragment.selectionSet);
            }
          }
        };
        collect(operation.selectionSet);
        const relevant = rules.filter(
          r => r.source === source && r.mutationFields?.some(f => fields.has(f)),
        );
        const fence = () =>
          Promise.all(
            relevant.map(async rule => {
              const scope = rule.scope(request);
              if (scope)
                await invalidate({ source, entityType: rule.entityType, scope }).catch(() => {});
            }),
          );
        await fence();
        try {
          const result = await executor(request);
          // #9658: an executor can commit eagerly before returning a stream; fence before any iteration.
          await fence();
          if (iterable(result)) {
            // #9658: lazy mutations commit during iteration; forward cancellation even before first next.
            let iterator: AsyncIterator<unknown, unknown, unknown>;
            // #9658: iterator acquisition itself can commit synchronously, including a throwing factory.
            try {
              iterator = result[Symbol.asyncIterator]();
            } finally {
              await fence();
            }
            return {
              [Symbol.asyncIterator]() {
                return this;
              },
              async next(value?: unknown) {
                try {
                  return await iterator.next(value);
                } finally {
                  await fence();
                }
              },
              async return(value?: unknown) {
                try {
                  return iterator.return
                    ? await iterator.return(value)
                    : { done: true as const, value };
                } finally {
                  await fence();
                }
              },
              async throw(error?: unknown) {
                try {
                  if (iterator.throw) return await iterator.throw(error);
                  await iterator.return?.();
                  throw error;
                } finally {
                  await fence();
                }
              },
            };
          }
          return result;
        } catch (error) {
          await fence();
          throw error;
        }
      }
      const pass = () => {
        metrics.bypasses++;
        return executor(request);
      };
      if (now() < bypassUntil) return pass();
      const rule = rules.find(
        r =>
          r.source === source &&
          operation?.kind === Kind.OPERATION_DEFINITION &&
          operation.selectionSet.selections.some(
            f => f.kind === Kind.FIELD && f.name.value === r.field,
          ),
      );
      if (!rule) return pass();
      if (
        operation?.kind === Kind.OPERATION_DEFINITION &&
        operation.operation === 'query' &&
        operation.selectionSet.selections.length > 1
      ) {
        const candidates = operation.selectionSet.selections.filter(
          field =>
            field.kind === Kind.FIELD &&
            rules.some(r => r.source === source && r.field === field.name.value),
        );
        if (candidates.length !== 1) return pass();
        return executeMixedEntityBatch({
          request,
          operation,
          rule,
          schema,
          executor,
          store,
          metrics,
          bounded,
          now,
          pass,
        });
      }
      let plan;
      try {
        plan = planEntityBatch(request, schema, rule);
      } catch {
        return pass();
      }
      if (!plan) return pass();
      let stamps: string[];
      let cached;
      const cacheKey = (identity: string, stamp: string) =>
        `entity:${plan.partition}:${hash(identity)}:${stamp}:${plan.selection}`;
      try {
        stamps = await bounded(() => store.snapshot(plan.partition, plan.keys));
        if (stamps.length !== plan.keys.length || stamps.some(stamp => typeof stamp !== 'string'))
          throw new Error('invalid entity fences');
        cached = await bounded(() =>
          store.read(plan.keys.map((key, i) => cacheKey(key, stamps[i]))),
        );
        if (!Array.isArray(cached)) throw new Error('invalid entity rows');
      } catch {
        metrics.cacheErrors++;
        return pass();
      }
      const rows = new Map<string, unknown[]>();
      const waits = new Map<string, Promise<Rows>>();
      const owned: Array<{
        identity: string;
        key: string;
        stamp: string;
        promise: Promise<Rows>;
        resolve(value: Rows): void;
      }> = [];
      plan.keys.forEach((identity, i) => {
        const entry = cached[i];
        if (entry && Array.isArray(entry.rows) && entry.expiresAt > now()) {
          rows.set(identity, entry.rows);
          metrics.hits++;
          return;
        }
        const key = cacheKey(identity, stamps[i]);
        const existing = pending.get(key);
        if (existing) {
          waits.set(identity, existing);
          metrics.coalesced++;
          return;
        }
        metrics.misses++;
        let resolve!: (value: Rows) => void;
        const promise = new Promise<Rows>(_resolve => {
          resolve = _resolve;
        });
        if (pending.size < maxPending) pending.set(key, promise);
        waits.set(identity, promise);
        owned.push({ identity, key, stamp: stamps[i], promise, resolve });
      });
      let originalResult: ExecutionResult<any> | AsyncIterable<ExecutionResult<any>> | undefined;
      let upstreamError: unknown;
      if (owned.length) {
        try {
          metrics.upstreamCalls++;
          originalResult = await executor(plan.withKeys(owned.map(o => o.identity)));
          if (
            iterable(originalResult) ||
            !originalResult ||
            originalResult.errors?.length ||
            originalResult.extensions ||
            !Array.isArray(originalResult.data?.[plan.responseKey])
          ) {
            owned.forEach(o => o.resolve(FALLBACK));
          } else {
            const grouped = new Map(owned.map(o => [o.identity, [] as unknown[]]));
            let complete = plan.isComplete(
              originalResult.data[plan.responseKey],
              owned.map(o => o.identity),
            );
            for (const row of originalResult.data[plan.responseKey] as unknown[]) {
              const identity = rule.identity(row);
              if (!identity || !grouped.has(identity)) {
                complete = false;
                break;
              }
              try {
                grouped.get(identity)!.push(plan.encode(row));
              } catch {
                complete = false;
                break;
              }
            }
            if (!complete) owned.forEach(o => o.resolve(FALLBACK));
            else {
              await Promise.all(
                owned.map(async o => {
                  const value = grouped.get(o.identity)!;
                  const ttl = value.length
                    ? rule.ttlSeconds
                    : (rule.negativeTtlSeconds ?? Math.min(rule.ttlSeconds, 10));
                  try {
                    const wrote = await bounded(() =>
                      store.write(
                        o.key,
                        { rows: value, expiresAt: now() + ttl * 1000 },
                        ttl,
                        plan.partition,
                        o.identity,
                        o.stamp,
                      ),
                    );
                    if (wrote === true) metrics.writes++;
                    else if (wrote === 'rejected') metrics.admissionRejected++;
                    else metrics.fencedWrites++;
                  } catch {
                    metrics.cacheErrors++;
                  }
                  o.resolve(value);
                }),
              );
            }
          }
        } catch (error) {
          upstreamError = error;
          owned.forEach(o => o.resolve(FALLBACK));
        } finally {
          owned.forEach(o => {
            if (pending.get(o.key) === o.promise) pending.delete(o.key);
          });
        }
      }
      const resolved = await Promise.all(
        [...waits].map(async ([identity, promise]) => [identity, await promise] as const),
      );
      if (resolved.some(([, value]) => value === FALLBACK)) {
        if (owned.length === plan.keys.length && !plan.injectedIdentity) {
          if (upstreamError) throw upstreamError;
          return originalResult!;
        }
        if (iterable(originalResult)) {
          // #9658: discard transformed streams only after closing their upstream iterator.
          const iterator = originalResult[Symbol.asyncIterator]();
          await bounded(() => Promise.resolve(iterator.return?.())).catch(() => {});
        }
        // #9658: a miss-only partial error has different indexes/data; fetch the original full request.
        return pass();
      }
      resolved.forEach(([identity, value]) => rows.set(identity, value as unknown[]));
      let fresh: boolean;
      try {
        const latest = await bounded(() => store.snapshot(plan.partition, plan.keys));
        fresh =
          latest.length === stamps.length &&
          latest.every((stamp, i) => typeof stamp === 'string' && stamp === stamps[i]);
      } catch {
        metrics.cacheErrors++;
        return pass();
      }
      if (!fresh) return pass();
      const resultRows = plan.keys.flatMap(identity => rows.get(identity)!);
      let decodedRows: unknown[];
      try {
        // #9658: completeness sees caller aliases with injected identity intact; hide identity only afterward.
        decodedRows = resultRows.map(plan.decode);
      } catch {
        metrics.cacheErrors++;
        return pass();
      }
      // #9658: original executor failures must escape rather than be retried as projection failures.
      if (!plan.isComplete(decodedRows, plan.keys)) return pass();
      return { data: { [plan.responseKey]: decodedRows.map(plan.finish) } } as ExecutionResult<any>;
    };
  const plugin: GatewayPlugin = {
    onSubgraphExecute({ subgraphName, subgraph, executor, setExecutor }) {
      // #9658: Hive's older info type is forwarded opaquely across GraphQL Tools versions.
      setExecutor(wrap(executor, subgraphName, subgraph) as typeof executor);
    },
  };
  return { wrap, plugin, invalidate, metrics, pendingCount: () => pending.size };
}
