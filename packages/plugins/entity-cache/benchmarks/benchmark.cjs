// #9658: execute frozen production cache factories against an archive-only virtual trace.
// No live endpoints, environment files, database, Redis server or application checkout writes.
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { createRequire } = require('node:module');
const req = createRequire(__filename);
const { parse, print, visit, Kind, buildSchema, getArgumentValues, validate } = req('graphql');
const {
  createProductCache,
  createEntityCache,
  createRedisEntityStore,
  strapiProductEntityRule,
  publicCatalogSelection,
} = require('./cache-frozen.cjs');
const NODES = Number(process.env.BENCHMARK_NODES || 2),
  CATALOG_SIZE = Number(process.env.BENCHMARK_PRODUCTS || 1000);
const ROOT = __dirname,
  PIN = '44e5bf5336cae28fcc4cfd89402f7c644e214584';
let virtualNow = 0;
const nativeNow = Date.now;
Date.now = () => virtualNow;
const byte = s => Buffer.byteLength(s),
  sha = s => crypto.createHash('sha256').update(s).digest('hex');
function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x += 0x6d2b79f5;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const schema = buildSchema(`scalar JSON
input SkuFilter { in: [String!] eq: String }
input ProductFiltersInput { sku: SkuFilter }
input PaginationArg { limit: Int start: Int }
enum PublicationStatus { PUBLISHED DRAFT }
type Media { documentId: ID name: String alternativeText: String url: String size: Float width: Int height: Int formats: JSON }
type Product { documentId: ID productId: Int sku: String name: String brand: String size: String regularPrice: Float department: String category: String storage: String isOrganic: Boolean isGlutenFree: Boolean isKosher: Boolean isHalal: Boolean isVegetarian: Boolean isVegan: Boolean isSnapEligible: Boolean isActive: Boolean countryOfOrigin: String description: String ingredients: String featuredImage: Media images(pagination: PaginationArg): [Media!]! }
type Query { products(filters: ProductFiltersInput pagination: PaginationArg sort: [String] status: PublicationStatus = PUBLISHED): [Product!]! }`);
const saved = JSON.parse(fs.readFileSync(path.join(ROOT, 'selections.json'), 'utf8')).selections;
const shapes = Object.fromEntries(
  Object.entries(saved).map(([name, item]) => [
    name,
    {
      file: item.file,
      source: item.originalDelegateSelection,
      selection: parse('{' + item.originalDelegateSelection + '}').definitions[0].selectionSet
        .selections[0].selectionSet,
    },
  ]),
);
for (const [name, s] of Object.entries(shapes)) {
  s.identityInjected = !s.selection.selections.some(
    f => f.kind === Kind.FIELD && f.name.value === 'sku',
  );
  if (s.identityInjected)
    s.selection = {
      ...s.selection,
      selections: [
        ...s.selection.selections,
        { kind: Kind.FIELD, name: { kind: Kind.NAME, value: 'sku' } },
      ],
    };
  s.effective = print(s.selection);
  s.hash = sha(s.effective);
  // Delegate variables are retained: baseline asks only missed SKU rows for variable filters.
  s.document = parse(
    `query Delegate($filters:ProductFiltersInput!,$pagination:PaginationArg!) { products(filters:$filters,pagination:$pagination) ${s.effective} }`,
  );
  const errors = validate(schema, s.document);
  if (errors.length) throw Error(errors.join(';'));
  if (!publicCatalogSelection(s.document.definitions[0].selectionSet.selections[0]))
    throw Error('nonpublic ' + name);
}
const workflowWeights = { shop: 0.4, cart: 0.2, order: 0.15, inventory: 0.15, pos: 0.1 };
const batchSizes = { shop: 24, cart: 6, order: 6, inventory: 25, pos: 8 };
// A min-heap gives Redis-like expiry at each virtual timestamp, without scanning all keys/request.
class VirtualRedis {
  constructor() {
    this.entries = new Map();
    this.heap = [];
    this.serial = 0;
    this.bytes = 0;
    this.peakBytes = 0;
    this.rowBytes = 0;
    this.peakRowBytes = 0;
    this.counts = { rows: 0, fences: 0, replay: 0 };
    this.peakCounts = { rows: 0, fences: 0, replay: 0 };
  }
  category(k) {
    return k.includes(':event:') ? 'replay' : k.includes(':fence:') ? 'fences' : 'rows';
  }
  size(k, v) {
    return (
      byte(k) +
      (v.type === 'hash'
        ? [...v.value].reduce((n, [a, b]) => n + byte(a) + byte(String(b)), 0)
        : byte(v.value))
    );
  }
  push(t) {
    let i = this.heap.length;
    this.heap.push(t);
    while (i) {
      let p = (i - 1) >> 1;
      if (this.heap[p][0] <= t[0]) break;
      this.heap[i] = this.heap[p];
      i = p;
    }
    this.heap[i] = t;
  }
  pop() {
    const top = this.heap[0],
      last = this.heap.pop();
    if (this.heap.length) {
      let i = 0;
      while (i * 2 + 1 < this.heap.length) {
        let a = i * 2 + 1,
          b = a + 1,
          c = b < this.heap.length && this.heap[b][0] < this.heap[a][0] ? b : a;
        if (this.heap[c][0] >= last[0]) break;
        this.heap[i] = this.heap[c];
        i = c;
      }
      this.heap[i] = last;
    }
    return top;
  }
  remove(k) {
    const old = this.entries.get(k);
    if (!old) return;
    const cat = this.category(k);
    this.bytes -= old.bytes;
    if (cat === 'rows') this.rowBytes -= old.bytes;
    this.counts[cat]--;
    this.entries.delete(k);
  }
  put(k, type, value, expiresAt = Infinity) {
    this.remove(k);
    const item = { type, value, expiresAt, serial: ++this.serial };
    item.bytes = this.size(k, item);
    this.entries.set(k, item);
    this.bytes += item.bytes;
    const cat = this.category(k);
    this.counts[cat]++;
    if (cat === 'rows') this.rowBytes += item.bytes;
    if (Number.isFinite(expiresAt)) this.push([expiresAt, k, item.serial]);
  }
  expire(k, ttl) {
    const v = this.entries.get(k);
    if (v) {
      const old = v.expiresAt;
      v.expiresAt = virtualNow + Number(ttl) * 1000;
      if (!Number.isFinite(old)) this.push([v.expiresAt, k, v.serial]);
    }
  }
  advance() {
    while (this.heap.length && this.heap[0][0] <= virtualNow) {
      const [, k, serial] = this.pop();
      const item = this.entries.get(k);
      if (item?.serial === serial) {
        if (item.expiresAt <= virtualNow) this.remove(k);
        else this.push([item.expiresAt, k, serial]);
      }
    }
  }
  sample() {
    this.peakBytes = Math.max(this.peakBytes, this.bytes);
    this.peakRowBytes = Math.max(this.peakRowBytes, this.rowBytes);
    for (const k of Object.keys(this.counts))
      this.peakCounts[k] = Math.max(this.peakCounts[k], this.counts[k]);
  }
  str(k) {
    return this.entries.get(k)?.value ?? null;
  }
  hget(k, f) {
    return this.entries.get(k)?.value.get(f) ?? null;
  }
  hset(k, fields) {
    const old = this.entries.get(k);
    const values = new Map(old?.value || []);
    for (let i = 0; i < fields.length; i += 2) values.set(fields[i], String(fields[i + 1]));
    this.put(k, 'hash', values, old?.expiresAt ?? Infinity);
  }
  async set(k, v, mode, ttl) {
    this.put(k, 'string', String(v), virtualNow + Number(ttl) * 1000);
    return 'OK';
  }
  async mget(...keys) {
    return keys.map(k => this.str(k));
  }
  async eval(script, n, ...args) {
    const keys = args.slice(0, n),
      a = args.slice(n);
    if (script.includes('local result = {}')) {
      if (!this.str(keys[0])) this.put(keys[0], 'string', a[0]);
      this.expire(keys[0], a.at(-1));
      const result = [];
      for (let i = 1; i < keys.length; i++) {
        if (!this.hget(keys[i], 'incarnation'))
          this.hset(keys[i], ['incarnation', a[i], 'generation', 0]);
        this.expire(keys[i], a.at(-1));
        result.push(
          this.str(keys[0]) +
            '.' +
            this.hget(keys[i], 'incarnation') +
            '.' +
            (this.hget(keys[i], 'generation') || '0'),
        );
      }
      return result;
    }
    if (script.includes('stamp ~= ARGV[1]')) {
      const g = this.str(keys[0]),
        inc = this.hget(keys[1], 'incarnation');
      if (!g || !inc) return 0;
      const stamp = g + '.' + inc + '.' + (this.hget(keys[1], 'generation') || '0');
      if (stamp !== a[0]) return 0;
      if (script.includes("redis.call('EXPIRE', KEYS[1], ARGV[4])")) {
        this.expire(keys[0], a[3]);
        this.expire(keys[1], a[3]);
      }
      this.put(keys[2], 'string', String(a[1]), virtualNow + Number(a[2]));
      return 1;
    }
    if (script.includes('local accepted = true')) {
      for (let i = 1; i < keys.length; i += 2) {
        let accepted = true;
        if (a[0] !== '') {
          if (this.entries.has(keys[i + 1])) accepted = false;
          else {
            this.hset(keys[i], [
              'version',
              Math.max(Number(this.hget(keys[i], 'version') ?? -1), Number(a[1])),
            ]);
            this.put(keys[i + 1], 'string', '1', virtualNow + Number(a[2]) * 1000);
          }
        }
        if (accepted) {
          if (!this.hget(keys[i], 'incarnation'))
            this.hset(keys[i], [
              'incarnation',
              a[(script.includes('ARGV[5 +') ? 4 : 3) + (i - 1) / 2],
            ]);
          this.hset(keys[i], ['generation', Number(this.hget(keys[i], 'generation') || 0) + 1]);
          this.expire(keys[i], script.includes('ARGV[5 +') ? a[3] : a[2]);
        }
      }
      return 1;
    }
    if (script.includes('for i=1,#KEYS do')) {
      for (let i = 0; i < keys.length; i++) {
        if (!this.hget(keys[i], 'incarnation')) this.hset(keys[i], ['incarnation', a[i + 1]]);
        this.hset(keys[i], ['generation', Number(this.hget(keys[i], 'generation') || 0) + 1]);
        this.expire(keys[i], a[0]);
      }
      return 1;
    }
    throw Error('unrecognized frozen Lua script');
  }
  snapshot() {
    return {
      rowEntries: this.counts.rows,
      fenceEntries: this.counts.fences,
      replayEntries: this.counts.replay,
      logicalRowKeyValueBytes: this.rowBytes,
      logicalTotalKeyValueBytes: this.bytes,
      peakLogicalRowKeyValueBytes: this.peakRowBytes,
      peakLogicalTotalKeyValueBytes: this.peakBytes,
      peakCounts: { ...this.peakCounts },
    };
  }
}
function media(id) {
  return {
    documentId: 'media-' + id,
    name: 'Product image ' + id,
    alternativeText: 'Catalog product photograph ' + id,
    url: 'https://catalog.example.invalid/uploads/product_' + id + '.jpg',
    size: 87.4,
    width: 1200,
    height: 1200,
    formats: {
      thumbnail: {
        name: 'thumbnail_product_' + id + '.jpg',
        width: 156,
        height: 156,
        url: 'https://catalog.example.invalid/uploads/thumbnail_product_' + id + '.jpg',
      },
      small: {
        name: 'small_product_' + id + '.jpg',
        width: 500,
        height: 500,
        url: 'https://catalog.example.invalid/uploads/small_product_' + id + '.jpg',
      },
    },
  };
}
function syntheticProduct(i) {
  return {
    documentId: 'canonical-product-' + String(i).padStart(4, '0'),
    productId: i,
    sku: 'SKU' + String(i).padStart(4, '0'),
    name: 'Catalog product ' + i + ' · revision 0',
    brand: 'Brand ' + (i % 40),
    size: '16 oz',
    regularPrice: 3.99 + (i % 20) / 2,
    department: ['Produce', 'Meat', 'Dairy', 'Bakery', 'Pantry'][i % 5],
    category: 'Category ' + (i % 25),
    storage: ['Refrigerated', 'Frozen', 'Dry'][i % 3],
    isOrganic: i % 4 === 0,
    isGlutenFree: i % 7 === 0,
    isKosher: i % 8 === 0,
    isHalal: i % 9 === 0,
    isVegetarian: i % 2 === 0,
    isVegan: i % 3 === 0,
    isSnapEligible: true,
    isActive: true,
    countryOfOrigin: 'US',
    description: 'Fresh catalog product description, handling and preparation. '.repeat(8),
    ingredients: ('Ingredient ' + i + ', ').repeat(6),
    featuredImage: media(i),
    images: [media(i), media(i + 1000)],
  };
}
// Census-grounded fixtures retain synthetic identities/text and observed mean metadata lengths.
function product(i) {
  const p = syntheticProduct(i);
  if (process.env.BENCHMARK_FIXTURE !== 'census') return p;
  p.description = 'Catalog description. '.repeat(4);
  p.ingredients = 'Ingredient list. '.repeat(2);
  const makeImage = id => {
    const m = media(id);
    m.formats = {};
    for (const [name, width, size] of [
      ['thumbnail', 156, 4.69],
      ['small', 500, 26.36],
      ['medium', 750, 42.85],
    ])
      m.formats[name] = {
        name: name + '_product_' + id + '.webp',
        hash: 'product_' + String(id).padStart(24, '0'),
        ext: '.webp',
        mime: 'image/webp',
        path: null,
        width,
        height: width,
        size,
        url: 'https://catalog.example.invalid/uploads/' + name + '_product_' + id + '.webp',
      };
    const need = 1100 - Buffer.byteLength(JSON.stringify(m.formats)) - 23;
    if (need > 0) m.formats.metadataPadding = 'x'.repeat(need);
    return m;
  };
  p.featuredImage = makeImage(i);
  p.images = Array.from({ length: i % 100 < 35 ? 4 : 3 }, (_, j) => makeImage(i + j * 1000 + 1000));
  return p;
}
function project(row, set) {
  const out = {};
  for (const f of set.selections) {
    if (f.kind !== Kind.FIELD) throw Error('unexpected selection');
    const name = f.name.value,
      key = f.alias?.value || name;
    let value = row[name];
    if (f.selectionSet)
      value = Array.isArray(value)
        ? value.map(x => project(x, f.selectionSet))
        : value
          ? project(value, f.selectionSet)
          : null;
    out[key] = value ?? null;
  }
  return out;
}
function argsFor(request) {
  return getArgumentValues(
    schema.getQueryType().getFields().products,
    request.document.definitions[0].selectionSet.selections[0],
    request.variables,
  );
}
function request(shape, skus) {
  return {
    document: shape.document,
    variables: { filters: { sku: { in: skus } }, pagination: { limit: 1000 } },
  };
}
function makeTrace(vendors, rps, seedOffset = 0) {
  let rand = rng(20261014 + vendors);
  const vendorCold = Array.from({ length: vendors }, () => {
    const pool = Array.from({ length: CATALOG_SIZE - 100 }, (_, i) => i + 100);
    for (let i = 0; i < 200; i++) {
      const j = i + Math.floor(rand() * (CATALOG_SIZE - 100 - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 200);
  });
  if (seedOffset) rand = rng(20261014 + vendors + seedOffset * 9973);
  const cycle = [
    'shop',
    'shop',
    'shop',
    'shop',
    'shop',
    'shop',
    'shop',
    'shop',
    'cart',
    'cart',
    'cart',
    'cart',
    'order',
    'order',
    'order',
    'inventory',
    'inventory',
    'inventory',
    'pos',
    'pos',
  ];
  const trace = [];
  let work = [];
  for (let i = 0; i < rps * 900; i++) {
    if (i % 20 === 0) {
      work = [...cycle];
      for (let j = 19; j > 0; j--) {
        const k = Math.floor(rand() * (j + 1));
        [work[j], work[k]] = [work[k], work[j]];
      }
    }
    const workflow = work[i % 20],
      vendor = Math.floor(rand() * vendors),
      hot = rand() < 0.4,
      pool = hot ? Array.from({ length: 100 }, (_, j) => j) : vendorCold[vendor],
      indexes = new Set();
    while (indexes.size < batchSizes[workflow]) indexes.add(pool[Math.floor(rand() * pool.length)]);
    trace.push({
      i,
      time: (i * 1000) / rps,
      workflow,
      vendor,
      hot,
      transport: ['cart', 'order'].includes(workflow) && rand() < 0.5 ? 'public' : 'internal',
      node: Math.floor(rand() * NODES),
      processDraw: rand(),
      skus: [...indexes].map(j => 'SKU' + String(j).padStart(4, '0')),
    });
  }
  const events = Array.from({ length: 15 }, (_, i) => ({
    time: 30000 + i * 60000,
    sku: 'SKU' + String(Math.floor(rand() * CATALOG_SIZE)).padStart(4, '0'),
    id: 'catalog-update-' + i,
    version: i % 3 === 0 ? 1000 - i : 1000 + i,
  }));
  return { trace, events, vendorCold };
}
function newStat() {
  return {
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
  };
}
module.exports = {
  makeTrace,
  shapes,
  batchSizes,
  workflowWeights,
  request,
  schema,
  project,
  product,
  VirtualRedis,
  setTime: t => {
    virtualNow = t;
  },
  getTime: () => virtualNow,
};
