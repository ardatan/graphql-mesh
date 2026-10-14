import { createHash } from 'node:crypto';
import { Kind, print, visit, type DocumentNode, type FieldNode, type ValueNode } from 'graphql';
import type { KeyValueCache } from '@graphql-mesh/types';

/**
 * #1157: per SKU cache for the Strapi product joins (internal gateway only).
 *
 * The shop search (SearchResult.strapi_products), the cart (ProductVariant.strapi_products) and the
 * admin searches join Strapi products by SKU with a batched @resolveTo (mesh.config.ts). The gateway
 * sends Strapi one `products(filters: { sku: { in: [...] } }, pagination: { limit })` query per
 * operation, and the response cache cannot cover it: it caches whole operations by root field, and
 * a search also carries live stock and the cart. So every search, filter or page change read Strapi.
 *
 * This plugin answers that subgraph call from Redis, one entry per (selection, SKU):
 *  - Only a query whose single root field is `products` with `filters` exactly `{ sku: { in } }` and a
 *    pagination limit that covers every SKU is touched. Anything else goes to Strapi unchanged.
 *  - Cached SKUs are served from Redis; only the missing ones are asked from Strapi (the `in` list is
 *    rewritten), and their rows are stored for PRODUCT_CACHE_TTL_S. A SKU with no product is stored
 *    as an empty list, so it is not asked again within the TTL either.
 *  - Order does not matter: the join regroups rows by `valueKeyField: "sku"`.
 *  - Freshness: Strapi product text and photos change rarely next to how often shoppers search. A
 *    product mutation through this gateway bumps a generation that is part of every key (this node);
 *    edits made elsewhere (catalog loader, Strapi admin) show within the TTL. A push from Strapi on
 *    product changes is strapi #63; when it lands it can call `bumpGeneration` the same way.
 *  - Fail open: the cache is the response cache's fail-open Redis wrapper, so a Redis problem is a miss.
 */

export const PRODUCT_CACHE_TTL_S = 60;
export const STRAPI_SUBGRAPH = 'Strapi';
const KEY_PREFIX = 'strapi-product:';
const PRODUCT_MUTATION_RE = /^(create|update|delete)Product$/;

type Executor = (request: any) => any;

export interface ExecutionRequestLike {
  document: DocumentNode;
  variables?: Record<string, any>;
  operationName?: string;
  [key: string]: any;
}

export interface ProductBatchPlan {
  /** The response key of the root field (its alias, else `products`). */
  responseKey: string;
  /** Hash of the field's selection set: rows are only reused for the same selection. */
  selectionHash: string;
  /** The SKUs asked for, de-duplicated, in request order. */
  skus: string[];
  /** The same request, asking Strapi for `skus` only. */
  withSkus(skus: string[]): ExecutionRequestLike;
}

const isPlainObject = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/** A literal or variable argument value as plain JSON; `undefined` when it cannot be resolved. */
function valueOf(node: ValueNode, variables: Record<string, any>): unknown {
  switch (node.kind) {
    case Kind.VARIABLE:
      return variables[node.name.value];
    case Kind.STRING:
    case Kind.ENUM:
      return node.value;
    case Kind.INT:
      return Number.parseInt(node.value, 10);
    case Kind.FLOAT:
      return Number.parseFloat(node.value);
    case Kind.BOOLEAN:
      return node.value;
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return node.values.map(v => valueOf(v, variables));
    case Kind.OBJECT:
      return Object.fromEntries(node.fields.map(f => [f.name.value, valueOf(f.value, variables)]));
    default:
      return undefined;
  }
}

/**
 * The batched SKU join this plugin may serve, or null for any other request (#1157). Pure, exported
 * for tests.
 */
export function planProductBatch(request: ExecutionRequestLike): ProductBatchPlan | null {
  const { document } = request;
  const variables = request.variables ?? {};
  if (!document || document.definitions.length !== 1) return null;
  const op = document.definitions[0];
  if (op.kind !== Kind.OPERATION_DEFINITION || op.operation !== 'query') return null;
  const fields = op.selectionSet.selections;
  if (fields.length !== 1 || fields[0].kind !== Kind.FIELD) return null;
  const field = fields[0] as FieldNode;
  if (field.name.value !== 'products' || !field.selectionSet) return null;

  // #1877: printed selections do not resolve variables in directives or nested arguments. Pass
  // those requests through until their effective projection can be keyed safely. Literal joins
  // retain the existing selection hash and per-SKU cache behavior.
  let variableSelection = false;
  visit(field.selectionSet, {
    Variable: () => {
      variableSelection = true;
    },
  });
  if (variableSelection || field.directives?.length || op.directives?.length) return null;

  const args = new Map((field.arguments ?? []).map(a => [a.name.value, a]));
  if ([...args.keys()].some(name => name !== 'filters' && name !== 'pagination')) return null;
  const filtersArg = args.get('filters');
  if (!filtersArg) return null;
  const filters = valueOf(filtersArg.value, variables);
  if (!isPlainObject(filters) || Object.keys(filters).length !== 1 || !isPlainObject(filters.sku))
    return null;
  if (Object.keys(filters.sku).length !== 1 || !Array.isArray(filters.sku.in)) return null;
  const list = filters.sku.in as unknown[];
  if (!list.every((s): s is string => typeof s === 'string')) return null;
  const skus = [...new Set(list as string[])];

  // Strapi's default page is 10 rows: only a limit that covers every SKU keeps "rows by SKU" complete.
  const paginationArg = args.get('pagination');
  const pagination = paginationArg ? valueOf(paginationArg.value, variables) : undefined;
  if (!isPlainObject(pagination) || Object.keys(pagination).some(k => k !== 'limit')) return null;
  if (typeof pagination.limit !== 'number' || pagination.limit < list.length) return null;

  const selectionHash = createHash('sha1')
    .update(print(field.selectionSet))
    .digest('hex')
    .slice(0, 16);
  const responseKey = field.alias?.value ?? field.name.value;

  const withSkus = (subset: string[]): ExecutionRequestLike => {
    // The batch passes the list as a variable. A literal `in` list is not rewritten: that request
    // goes to Strapi whole (and is then cached whole).
    if (filtersArg.value.kind !== Kind.VARIABLE) return request;
    const name = filtersArg.value.name.value;
    return { ...request, variables: { ...variables, [name]: { sku: { in: subset } } } };
  };

  return { responseKey, selectionHash, skus, withSkus };
}

const isAsyncIterable = (v: any): v is AsyncIterable<unknown> =>
  v != null && typeof v[Symbol.asyncIterator] === 'function';

export interface ProductCacheOptions {
  cache: KeyValueCache;
  ttlSeconds?: number;
}

export interface ProductCache {
  /** Wraps a Strapi subgraph executor. */
  wrap(executor: Executor): Executor;
  /** Drops every cached row on this node (a new generation in every key). */
  bumpGeneration(): void;
  /** Hive gateway plugin: wraps the Strapi executor and bumps the generation on product mutations. */
  plugin: Record<string, any>;
}

/** Root fields of a mutation request. */
function mutationFields(document: DocumentNode | undefined): string[] {
  const op = document?.definitions.find(d => d.kind === Kind.OPERATION_DEFINITION);
  if (!op || op.kind !== Kind.OPERATION_DEFINITION || op.operation !== 'mutation') return [];
  return op.selectionSet.selections.flatMap(s => (s.kind === Kind.FIELD ? [s.name.value] : []));
}

export function createProductCache({
  cache,
  ttlSeconds = PRODUCT_CACHE_TTL_S,
}: ProductCacheOptions): ProductCache {
  // Starts at the boot time, so a restarted gateway never reads rows another process stored under an
  // older generation of the same number.
  let generation = Date.now().toString(36);
  let bumps = 0;
  const bumpGeneration = () => {
    bumps += 1;
    generation = `${Date.now().toString(36)}.${bumps}`;
  };
  const keyFor = (gen: string, selectionHash: string, sku: string) =>
    `${KEY_PREFIX}${gen}:${selectionHash}:${sku}`;

  const wrap =
    (executor: Executor): Executor =>
    async (request: ExecutionRequestLike) => {
      const plan = planProductBatch(request);
      if (!plan || plan.skus.length === 0) return executor(request);
      const gen = generation;
      const cached = await Promise.all(
        plan.skus.map(sku => cache.get(keyFor(gen, plan.selectionHash, sku))),
      );
      // #1877: a product write may have invalidated hits while the cache reads were pending.
      if (gen !== generation) return executor(request);
      const hits: unknown[] = [];
      const misses: string[] = [];
      plan.skus.forEach((sku, i) => {
        const value = cached[i];
        if (Array.isArray(value)) hits.push(...value);
        else misses.push(sku);
      });
      if (misses.length === 0) return { data: { [plan.responseKey]: hits } };

      // #1877: when every SKU misses, preserve the caller's complete request and its error indices.
      const missRequest = misses.length === plan.skus.length ? request : plan.withSkus(misses);
      // A literal `in` list cannot be narrowed: ask for everything and cache all of it.
      const asked = missRequest === request ? plan.skus : misses;
      const result = await executor(missRequest);
      // #1877: errors from a narrowed query have paths relative to that subset. Re-execute the
      // original request rather than combining partial data with cached hits or translating paths.
      if (gen !== generation || isAsyncIterable(result) || !result || result.errors?.length) {
        return missRequest === request ? result : executor(request);
      }
      const rows = result.data?.[plan.responseKey];
      if (!Array.isArray(rows)) return missRequest === request ? result : executor(request);

      // Group by SKU; a row without a requested string SKU cannot be safely merged or stored.
      const bySku = new Map<string, unknown[]>(asked.map(sku => [sku, []]));
      let groupable = true;
      for (const row of rows) {
        const sku = isPlainObject(row) ? row.sku : undefined;
        if (typeof sku !== 'string' || !bySku.has(sku)) {
          groupable = false;
          break;
        }
        bySku.get(sku)!.push(row);
      }
      if (!groupable) return missRequest === request ? result : executor(request);
      // Only store when no product mutation ran meanwhile (the rows may be from before it).
      if (gen === generation) {
        await Promise.all(
          [...bySku].map(([sku, skuRows]) =>
            cache.set(keyFor(gen, plan.selectionHash, sku), skuRows, { ttl: ttlSeconds }),
          ),
        );
      }
      // #1877: do not merge hits with a response that raced a product mutation during cache writes.
      if (gen !== generation) return missRequest === request ? result : executor(request);
      if (asked === plan.skus) return result;
      return { ...result, data: { ...result.data, [plan.responseKey]: [...hits, ...rows] } };
    };

  const plugin = {
    onSubgraphExecute({ subgraphName, executionRequest, executor, setExecutor }: any) {
      if (subgraphName !== STRAPI_SUBGRAPH) return;
      if (mutationFields(executionRequest?.document).some(f => PRODUCT_MUTATION_RE.test(f))) {
        // Before and after: a read that started before the write must not store old rows (the
        // generation check above), and one that starts during it gets a fresh key after it.
        bumpGeneration();
        return () => {
          bumpGeneration();
        };
      }
      setExecutor(wrap(executor));
    },
  };

  return { wrap, bumpGeneration, plugin };
}
