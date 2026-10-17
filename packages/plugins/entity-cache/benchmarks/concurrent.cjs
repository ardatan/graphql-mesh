// #9658: discrete-event cache replay. Source fills take40ms; actual frozen cache pending registries run concurrently.
const fs = require('node:fs'),
  path = require('node:path'),
  { AsyncLocalStorage } = require('node:async_hooks');
const { createRequire } = require('node:module'),
  req = createRequire(__filename);
const { getArgumentValues } = req('graphql');
const m = require('./benchmark.cjs'),
  {
    createProductCache,
    createEntityCache,
    createRedisEntityStore,
    strapiProductEntityRule,
  } = require('./cache-frozen.cjs');
const ROOT = __dirname,
  storeContext = new AsyncLocalStorage();
const NODES = Number(process.env.BENCHMARK_NODES || 3),
  PRODUCTS = Number(process.env.BENCHMARK_PRODUCTS || 4614),
  DURATION = Number(process.env.BENCHMARK_DURATION || 900),
  WARMUP = Number(process.env.BENCHMARK_WARMUP || 300),
  PROCS = Number(process.env.BENCHMARK_PROCESSES || 1),
  RPS = 50;
const stat = () => ({
  requests: 0,
  entityReads: 0,
  hits: 0,
  misses: 0,
  wholeRequestHits: 0,
  sourceCalls: 0,
  sourceRows: 0,
  sourceResponseBytes: 0,
  staleEntityReads: 0,
  staleRequests: 0,
  publicRequests: 0,
});
const add = (to, from) => {
  for (const k of Object.keys(to)) to[k] += from[k];
};
function fixture() {
  const rows = [];
  for (let hourPart = 0; hourPart < Math.ceil(DURATION / 900); hourPart++) {
    const base = m.makeTrace(500, 50, hourPart);
    for (const r of base.trace) {
      const time = hourPart * 900000 + r.time;
      if (time < DURATION * 1000) rows.push({ ...r, time, i: rows.length });
    }
  }
  const events = [];
  for (
    let i = 0;
    i < Math.floor((DURATION / 3600) * Number(process.env.BENCHMARK_EDITS_PER_HOUR || 2));
    i++
  )
    events.push({
      time: ((i + 0.5) * 3600000) / Number(process.env.BENCHMARK_EDITS_PER_HOUR || 2),
      sku: 'SKU' + String((i * 67 + 17) % PRODUCTS).padStart(4, '0'),
      id: 'rare-description-' + i,
      version: 1000 + i,
    });
  return { rows, events };
}
async function simulate(mode, ttl, f) {
  m.setTime(-100);
  const nodes = Array.from({ length: NODES }, () => new m.VirtualRedis()),
    products = new Map(
      Array.from({ length: PRODUCTS }, (_, i) => {
        const p = m.product(i);
        return [p.sku, p];
      }),
    ),
    lastCommit = new Map();
  if (process.env.BENCHMARK_LOGICAL_BUDGET) {
    for (const node of nodes) {
      node.evictions = 0;
      const put = node.put.bind(node),
        str = node.str.bind(node),
        hget = node.hget.bind(node);
      const touch = k => {
        const item = node.entries.get(k);
        if (item) {
          node.entries.delete(k);
          node.entries.set(k, item);
        }
      };
      node.put = (...args) => {
        put(...args);
        while (node.bytes > Number(process.env.BENCHMARK_LOGICAL_BUDGET)) {
          node.remove(node.entries.keys().next().value);
          node.evictions++;
        }
      };
      node.str = k => {
        const value = str(k);
        touch(k);
        return value;
      };
      node.hget = (k, f) => {
        const value = hget(k, f);
        touch(k);
        return value;
      };
    }
  }
  const total = stat(),
    warm = stat(),
    byWorkflow = Object.fromEntries(Object.keys(m.shapes).map(k => [k, stat()])),
    warmByWorkflow = Object.fromEntries(Object.keys(m.shapes).map(k => [k, stat()])),
    caches = [],
    executors = [];
  const tasks = [],
    free = Array(8).fill(0),
    latencies = [],
    timelines = [],
    warmLatencies = [];
  let taskSerial = 0;
  const schedule = (time, run) => {
    const x = { time, run, serial: ++taskSerial };
    let i = tasks.length;
    tasks.push(x);
    while (i) {
      const p = (i - 1) >> 1;
      if (tasks[p].time < time || (tasks[p].time === time && tasks[p].serial < x.serial)) break;
      tasks[i] = tasks[p];
      i = p;
    }
    tasks[i] = x;
  };
  const take = () => {
    const x = tasks[0],
      last = tasks.pop();
    if (tasks.length) {
      let i = 0;
      while (i * 2 + 1 < tasks.length) {
        const a = i * 2 + 1,
          b = a + 1,
          c =
            b < tasks.length &&
            (tasks[b].time < tasks[a].time ||
              (tasks[b].time === tasks[a].time && tasks[b].serial < tasks[a].serial))
              ? b
              : a;
        if (
          tasks[c].time > last.time ||
          (tasks[c].time === last.time && tasks[c].serial > last.serial)
        )
          break;
        tasks[i] = tasks[c];
        i = c;
      }
      tasks[i] = last;
    }
    return x;
  };
  for (let node = 0; node < NODES; node++) {
    const bucket = { internal: [], public: [] };
    for (let proc = 0; proc < PROCS; proc++)
      for (const transport of ['internal', 'public']) {
        const source = async request => {
          const active = storeContext.getStore();
          const args = getArgumentValues(
              m.schema.getQueryType().getFields().products,
              request.document.definitions[0].selectionSet.selections[0],
              request.variables,
            ),
            field = request.document.definitions[0].selectionSet.selections[0],
            rows = args.filters.sku.in.flatMap(k =>
              products.has(k) ? [m.project(products.get(k), field.selectionSet)] : [],
            ),
            result = { data: { products: rows } };
          active.sourceCalls++;
          active.sourceRows += rows.length;
          active.sourceResponseBytes += Buffer.byteLength(JSON.stringify(result));
          const i = free.indexOf(Math.min(...free)),
            completion = Math.max(m.getTime(), free[i]) + 40;
          free[i] = completion;
          await new Promise(resolve => schedule(completion, resolve));
          return result;
        };
        let wrapped = source,
          cache;
        if (mode === 'generic') {
          const underlying = createRedisEntityStore(nodes[node], 'nourishment-entity-v1'),
            instrumented = {
              ...underlying,
              async read(keys) {
                const values = await underlying.read(keys),
                  active = storeContext.getStore();
                for (const v of values) {
                  if (v && v.expiresAt > m.getTime()) active.hits++;
                  else active.misses++;
                }
                return values;
              },
            };
          cache = createEntityCache({
            store: instrumented,
            rules: [{ ...strapiProductEntityRule, ttlSeconds: ttl }],
            now: () => m.getTime(),
          });
          wrapped = cache.wrap(source, 'Strapi', m.schema);
          caches.push(cache);
        }
        if (mode === 'legacy' && transport === 'internal') {
          m.setTime(-100 + node * 20 + proc);
          cache = createProductCache({
            ttlSeconds: 60,
            cache: {
              async get(k) {
                const active = storeContext.getStore(),
                  v = nodes[node].str(k);
                if (v === null) {
                  active.misses++;
                  return undefined;
                }
                active.hits++;
                return JSON.parse(v);
              },
              async set(k, v, opt) {
                nodes[node].put(k, 'string', JSON.stringify(v), m.getTime() + opt.ttl * 1000);
              },
            },
          });
          wrapped = cache.wrap(source);
        }
        bucket[transport].push(wrapped);
      }
    executors.push(bucket);
  }
  let outstanding = 0,
    finished = 0,
    failure;
  const results = [];
  for (const row of f.rows)
    schedule(row.time + 176, () => {
      const active = stat();
      active.requests = 1;
      active.entityReads = row.skus.length;
      active.publicRequests = Number(row.transport === 'public');
      if (mode === 'none' || (mode === 'legacy' && row.transport === 'public'))
        active.misses = row.skus.length;
      const start = m.getTime();
      outstanding++;
      const promise = storeContext
        .run(active, () =>
          executors[row.node][row.transport][Math.floor(row.processDraw * PROCS)](
            m.request(m.shapes[row.workflow], row.skus),
          ),
        )
        .then(result => {
          if (result.errors || result.data.products.length !== row.skus.length)
            throw Error('parity failure');
          active.wholeRequestHits = Number(active.misses === 0 && active.sourceCalls === 0);
          for (const p of result.data.products) {
            if (p.name !== products.get(p.sku).name && (lastCommit.get(p.sku) || 0) <= start)
              active.staleEntityReads++;
          }
          active.staleRequests = Number(active.staleEntityReads > 0);
          add(total, active);
          add(byWorkflow[row.workflow], active);
          if (row.time >= WARMUP * 1000) {
            add(warm, active);
            add(warmByWorkflow[row.workflow], active);
            warmLatencies.push(m.getTime() - row.time);
          }
          latencies.push(m.getTime() - row.time);
          finished++;
          outstanding--;
        })
        .catch(e => {
          failure = e;
          outstanding--;
        });
      results.push(promise);
    });
  for (const e of f.events)
    schedule(e.time, async () => {
      const p = products.get(e.sku);
      p.name = p.name.replace(/revision \d+/, 'revision ' + (e.version - 999));
      lastCommit.set(e.sku, e.time);
      if (mode === 'generic')
        for (let node = 0; node < NODES; node++)
          await caches[node * PROCS * 2].invalidate({
            source: 'Strapi',
            entityType: 'Product',
            scope: 'public-catalog',
            identities: [e.sku],
            event: { id: e.id, version: e.version },
          });
    });
  for (let time = 0; time <= DURATION * 1000; time += 10000)
    schedule(time, () => {
      nodes.forEach(s => s.sample());
      timelines.push({
        seconds: time / 1000,
        ...total,
        totalLogicalBytes: nodes.reduce((n, s) => n + s.bytes, 0),
      });
    });
  let maxOutstanding = 0;
  while (tasks.length) {
    const first = take();
    m.setTime(first.time);
    nodes.forEach(s => s.advance());
    const same = [first];
    while (tasks.length && tasks[0].time === first.time) same.push(take());
    for (const task of same) await task.run();
    await new Promise(setImmediate);
    maxOutstanding = Math.max(maxOutstanding, outstanding);
    nodes.forEach(s => s.sample());
    if (failure) throw failure;
  }
  await Promise.all(results);
  if (finished !== f.rows.length || outstanding) throw Error('unfinished replay');
  latencies.sort((a, b) => a - b);
  warmLatencies.sort((a, b) => a - b);
  const warmPct = p =>
    warmLatencies[Math.min(warmLatencies.length - 1, Math.floor(warmLatencies.length * p))];
  const pct = p => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))];
  for (const s of [total, warm, ...Object.values(byWorkflow), ...Object.values(warmByWorkflow)]) {
    s.entityHitRate = s.hits / s.entityReads;
    s.wholeRequestHitRate = s.wholeRequestHits / s.requests;
  }
  const proxy = h => ({
    sourceCalls: (warm.sourceCalls / (DURATION - WARMUP)) * 3600 * h * 30,
    sourceRows: (warm.sourceRows / (DURATION - WARMUP)) * 3600 * h * 30,
    sourceResponseBytes: (warm.sourceResponseBytes / (DURATION - WARMUP)) * 3600 * h * 30,
  });
  return {
    mode,
    ttlSeconds: ttl,
    nodes: NODES,
    processesPerNodePerTransport: PROCS,
    products: PRODUCTS,
    requestsPerSecond: RPS,
    virtualSeconds: DURATION,
    warmupSeconds: WARMUP,
    events: f.events.length,
    stats: total,
    steadyWindowStats: warm,
    byWorkflow,
    steadyByWorkflow: warmByWorkflow,
    monthly30DayProjectionFromSteady: { trading12h: proxy(12), continuous24h: proxy(24) },
    logicalBudgetPerNode: Number(process.env.BENCHMARK_LOGICAL_BUDGET || 0) || null,
    evictionsByNode: nodes.map(s => s.evictions || 0),
    memoryByNode: nodes.map(s => s.snapshot()),
    projectedSteadyLatencyMs: {
      p50: warmPct(0.5),
      p95: warmPct(0.95),
      p99: warmPct(0.99),
      mean: warmLatencies.reduce((a, b) => a + b, 0) / warmLatencies.length,
      max: warmLatencies.at(-1),
    },
    projectedLatencyMs: {
      p50: pct(0.5),
      p95: pct(0.95),
      p99: pct(0.99),
      mean: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      max: latencies.at(-1),
    },
    coalescedEntityReads: caches.reduce((n, c) => n + c.metrics.coalesced, 0),
    maxConcurrentOutstanding: maxOutstanding,
    cacheErrors: caches.reduce((n, c) => n + c.metrics.cacheErrors, 0),
    method:
      'Discrete-event arrivals,176ms modeled noncache work,40ms modeled source fill with8 total service workers; actual cache executors execute concurrently against virtual Redis. Source call/row/JSON counts measured in this replay; full API latency/capacity not measured.',
    timelines,
  };
}
async function main() {
  const f = fixture();
  if (new Set(f.rows.map(r => r.node)).size !== NODES)
    throw Error('trace/cache nodecount mismatch');
  const runs = [],
    profiles = process.env.BENCHMARK_PROFILES || 'none:60,legacy:60,generic:60';
  for (const profile of profiles.split(',')) {
    const [mode, t] = profile.split(':');
    console.log('START', mode, t, PRODUCTS, DURATION, PROCS);
    runs.push(await simulate(mode, Number(t), f));
    const out = {
      policyProposal: process.env.BENCHMARK_POLICY_PROPOSAL || 'frozen',
      freshRandomArrivalsPer15Min: true,
      sourcePin: 'upstream-working-tree; legacy baseline 44e5bf5336cae28fcc4cfd89402f7c644e214584',
      candidatePublicCoverage:
        'Canonical five workflows; mixed roots verified separately by package tests.',
      fixture:
        'Synthetic canonical values/media sized from development census (~1100B formats per image,3.35 additional images+featured);not actual production catalog traffic.',
      rarity:
        'Event rate is an explicit run parameter;default2 total corrections/hour across working set. Normalized2/hour/1000 is run at9.228/hour for4614 or70.5/hour for35250.',
      negativeTtlSeconds: 10,
      missingSkuFraction: 0,
      runs,
    };
    fs.writeFileSync(
      path.join(
        ROOT,
        `concurrent-${PRODUCTS}-${DURATION}-${PROCS}-${process.env.BENCHMARK_POLICY_PROPOSAL || 'frozen'}-${process.env.BENCHMARK_TAG || 'fresh'}.json`,
      ),
      JSON.stringify(out, null, 2),
    );
    console.log(
      'DONE',
      mode,
      t,
      runs.at(-1).steadyWindowStats.sourceCalls,
      runs.at(-1).steadyWindowStats.sourceRows,
    );
  }
}
main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
