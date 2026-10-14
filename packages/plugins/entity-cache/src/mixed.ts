import {
  Kind,
  visit,
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLSchema,
  type OperationDefinitionNode,
} from 'graphql';
import type { ExecutionRequest, Executor } from '@graphql-tools/utils';
import { hash, planEntityBatch } from './plan.js';
import type { EntityCacheMetrics, EntityRule, EntityStore } from './types.js';

// #9658: keep caller-specific roots live when Hive batches canonical and private delegates together.
function withRoots(
  request: ExecutionRequest,
  operation: OperationDefinitionNode,
  roots: readonly FieldNode[],
): ExecutionRequest {
  const fragments = request.document.definitions.filter(
    (d): d is FragmentDefinitionNode => d.kind === Kind.FRAGMENT_DEFINITION,
  );
  const needed = new Set<string>();
  const scan = (node: any) =>
    visit(node, {
      FragmentSpread(node) {
        needed.add(node.name.value);
      },
    });
  roots.forEach(scan);
  let previous = -1;
  while (previous !== needed.size) {
    previous = needed.size;
    fragments.filter(f => needed.has(f.name.value)).forEach(scan);
  }
  const kept = fragments.filter(f => needed.has(f.name.value));
  const used = new Set<string>();
  const variables = (node: any) =>
    visit(node, {
      Variable(node) {
        used.add(node.name.value);
      },
    });
  roots.forEach(variables);
  kept.forEach(variables);
  operation.directives?.forEach(variables);
  return {
    ...request,
    document: {
      ...request.document,
      definitions: [
        {
          ...operation,
          variableDefinitions: operation.variableDefinitions?.filter(v =>
            used.has(v.variable.name.value),
          ),
          selectionSet: { ...operation.selectionSet, selections: roots },
        },
        ...kept,
      ],
    },
  };
}
const isObject = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const iterable = (value: unknown): value is AsyncIterable<unknown> =>
  !!value && typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function';

export async function executeMixedEntityBatch({
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
}: {
  request: ExecutionRequest;
  operation: OperationDefinitionNode;
  rule: EntityRule;
  schema: GraphQLSchema;
  executor: Executor;
  store: EntityStore;
  metrics: EntityCacheMetrics;
  bounded<T>(run: () => Promise<T>): Promise<T>;
  now(): number;
  pass(): ReturnType<Executor>;
}): Promise<any> {
  if (
    request.document.definitions.filter(definition => definition.kind === Kind.OPERATION_DEFINITION)
      .length !== 1
  )
    return pass();
  if (request.operationName && operation.name?.value !== request.operationName) return pass();
  const roots = operation.selectionSet.selections;
  if (roots.some(root => root.kind !== Kind.FIELD)) return pass();
  const fields = roots as readonly FieldNode[];
  if (new Set(fields.map(field => field.alias?.value ?? field.name.value)).size !== fields.length)
    return pass();
  const entityRoots = fields.filter(field => field.name.value === rule.field);
  if (entityRoots.length !== 1) return pass();
  let plan;
  try {
    plan = planEntityBatch(withRoots(request, operation, entityRoots), schema, rule);
  } catch {
    return pass();
  }
  if (!plan) return pass();
  // Mixed batches keep the original request on misses; identity injection stays on the single-root path.
  if (plan.injectedIdentity) return pass();
  const upstream = (req: ExecutionRequest) => {
    metrics.upstreamCalls++;
    return executor(req);
  };
  const keyFor = (identity: string, stamp: string) =>
    `entity:${plan.partition}:${hash(identity)}:${stamp}:${plan.selection}`;
  let stamps: string[];
  let entries;
  try {
    stamps = await bounded(() => store.snapshot(plan.partition, plan.keys));
    if (stamps.length !== plan.keys.length || stamps.some(stamp => typeof stamp !== 'string'))
      throw new Error('invalid entity fences');
    entries = await bounded(() => store.read(plan.keys.map((key, i) => keyFor(key, stamps[i]))));
    if (!Array.isArray(entries)) throw new Error('invalid entity rows');
  } catch {
    metrics.cacheErrors++;
    return pass();
  }
  const hits = plan.keys.map(
    (_, i) => !!entries[i] && Array.isArray(entries[i]!.rows) && entries[i]!.expiresAt > now(),
  );
  metrics.hits += hits.filter(Boolean).length;
  metrics.misses += hits.filter(hit => !hit).length;
  const freshFences = async () => {
    try {
      const latest = await bounded(() => store.snapshot(plan.partition, plan.keys));
      return (
        latest.length === stamps.length &&
        latest.every((stamp, i) => typeof stamp === 'string' && stamp === stamps[i])
      );
    } catch {
      metrics.cacheErrors++;
      return false;
    }
  };
  if (hits.every(Boolean)) {
    const joined = plan.keys.flatMap((_, i) => entries[i]!.rows);
    // #9658: prove the original combined result before omitting the canonical source root.
    if (!plan.isComplete(joined)) return upstream(request);
    const live = await upstream(
      withRoots(
        request,
        operation,
        fields.filter(field => field !== entityRoots[0]),
      ),
    );
    if (
      iterable(live) ||
      !live ||
      live.errors?.length ||
      live.extensions ||
      !isObject(live.data) ||
      fields
        .filter(field => field !== entityRoots[0])
        .some(
          field =>
            !Object.prototype.hasOwnProperty.call(
              live.data,
              field.alias?.value ?? field.name.value,
            ),
        )
    ) {
      if (iterable(live)) {
        const iterator = live[Symbol.asyncIterator]();
        await bounded(() => Promise.resolve(iterator.return?.())).catch(() => {});
      }
      return upstream(request);
    }
    if (!(await freshFences())) return upstream(request);
    const entityRows = joined.map(plan.project);
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      const key = field.alias?.value ?? field.name.value;
      if (key === plan.responseKey) data[key] = entityRows;
      else if (Object.prototype.hasOwnProperty.call(live.data, key)) data[key] = live.data[key];
    }
    return { ...live, data };
  }
  // Partial hits deliberately execute the complete unchanged native batch. Private results never coalesce.
  const result = await upstream(request);
  if (
    iterable(result) ||
    !result ||
    result.errors?.length ||
    result.extensions ||
    !isObject(result.data) ||
    !Array.isArray(result.data[plan.responseKey]) ||
    !plan.isComplete(result.data[plan.responseKey])
  )
    return result;
  const grouped = new Map(plan.keys.map(identity => [identity, [] as unknown[]]));
  for (const row of result.data[plan.responseKey]) {
    const identity = rule.identity(row);
    if (!identity || !grouped.has(identity)) return result;
    grouped.get(identity)!.push(row);
  }
  await Promise.all(
    plan.keys.map(async (identity, i) => {
      const rows = grouped.get(identity)!;
      const ttl = rows.length
        ? rule.ttlSeconds
        : (rule.negativeTtlSeconds ?? Math.min(rule.ttlSeconds, 10));
      try {
        const wrote = await bounded(() =>
          store.write(
            keyFor(identity, stamps[i]),
            { rows, expiresAt: now() + ttl * 1000 },
            ttl,
            plan.partition,
            identity,
            stamps[i],
          ),
        );
        if (wrote === true) metrics.writes++;
        else if (wrote === 'rejected') metrics.admissionRejected++;
        else metrics.fencedWrites++;
      } catch {
        metrics.cacheErrors++;
      }
    }),
  );
  if (!(await freshFences())) return upstream(request);
  return result;
}
