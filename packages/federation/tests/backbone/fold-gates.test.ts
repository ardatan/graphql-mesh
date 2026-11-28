/**
 * Federation backbone fold coverage:
 * - wave-per-subgraph fold on a minimal dual-root inventory supergraph
 * - planning-large fetch-count gates vs the Hive Router Rust query planner
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Kind, parse } from 'graphql';
import { getFragmentsFromDocument } from '@graphql-tools/executor';
import { buildStitchPlan, collectExecutableHops, type StitchPlanNode } from '@graphql-tools/stitch';
import { getStitchedSchemaFromSupergraphSdl } from '../../src/supergraph';
import { DESCRIPTIONS, QUERIES } from '../fixtures/planning-large/queries.js';

/**
 * Minimal federation supergraph where inventory resolves fields on two entity
 * types under separate root branches. Wave-per-subgraph fold should emit one
 * inventory hop (BatchFetch / covering), not two.
 */
const MINIMAL_DUAL_ROOT_SDL = /* GraphQL */ `
  schema
    @link(url: "https://specs.apollo.dev/link/v1.0")
    @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) {
    query: Query
  }

  directive @join__graph(name: String!, url: String!) on ENUM_VALUE
  directive @join__field(
    graph: join__Graph
    requires: join__FieldSet
    provides: join__FieldSet
    type: String
    external: Boolean
    override: String
    usedOverridden: Boolean
  ) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
  directive @join__type(
    graph: join__Graph!
    key: join__FieldSet
    extension: Boolean! = false
    resolvable: Boolean! = true
    isInterfaceObject: Boolean! = false
  ) on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR
  directive @link(
    url: String
    as: String
    for: link__Purpose
    import: [link__Import]
  ) repeatable on SCHEMA

  scalar join__FieldSet
  scalar link__Import
  enum link__Purpose {
    SECURITY
    EXECUTION
  }
  enum join__Graph {
    BOOKS @join__graph(name: "books", url: "http://books")
    MAGAZINES @join__graph(name: "magazines", url: "http://magazines")
    INVENTORY @join__graph(name: "inventory", url: "http://inventory")
  }

  type Book @join__type(graph: BOOKS, key: "id") @join__type(graph: INVENTORY, key: "id") {
    id: ID!
    title: String @join__field(graph: BOOKS)
    inStock: Boolean @join__field(graph: INVENTORY)
  }

  type Magazine @join__type(graph: MAGAZINES, key: "id") @join__type(graph: INVENTORY, key: "id") {
    id: ID!
    title: String @join__field(graph: MAGAZINES)
    inStock: Boolean @join__field(graph: INVENTORY)
  }

  type Query {
    book(id: ID!): Book @join__field(graph: BOOKS)
    magazine(id: ID!): Magazine @join__field(graph: MAGAZINES)
  }
`;

function countPlanHttpHops(root: StitchPlanNode) {
  const hops: Parameters<typeof collectExecutableHops>[1] = [];
  collectExecutableHops(root, hops, {});
  return {
    http: hops.filter(h => h.kind === 'Fetch' || h.kind === 'BatchFetch').length,
    batch: hops.filter(h => h.kind === 'BatchFetch').length,
  };
}

describe('backbone wave-per-subgraph fold (federation)', () => {
  it('folds Book||Magazine inventory under separate roots to ≤1 inventory hop', () => {
    const schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl: MINIMAL_DUAL_ROOT_SDL,
    });
    const document = parse(/* GraphQL */ `
      query DualInventory {
        book(id: "1") {
          id
          title
          inStock
        }
        magazine(id: "2") {
          id
          title
          inStock
        }
      }
    `);
    const op = document.definitions.find(d => d.kind === Kind.OPERATION_DEFINITION)!;
    const plan = buildStitchPlan(schema, op, getFragmentsFromDocument(document), {});
    expect(plan.incomplete).toBe(false);
    const { http } = countPlanHttpHops(plan.root);
    // Known target: 2 root Fetches + ≤1 inventory wave (wave fold).
    // Without wave fold this was 2 entity Fetches (http ≥ 4).
    expect(http).toBeLessThanOrEqual(3);
    const hops: Parameters<typeof collectExecutableHops>[1] = [];
    collectExecutableHops(plan.root, hops, {});
    const inventoryHops = hops.filter(
      h =>
        (h.kind === 'BatchFetch' &&
          h.aliases.some(a => a.entityTypeName === 'Book') &&
          h.aliases.some(a => a.entityTypeName === 'Magazine')) ||
        (h.kind === 'Fetch' &&
          !h.rootField &&
          (h.entityTypeName === 'Book' || h.entityTypeName === 'Magazine')),
    );
    expect(inventoryHops.length).toBeLessThanOrEqual(1);
  });
});

const PLANNING_LARGE_SDL = readFileSync(
  join(__dirname, '../fixtures/planning-large/supergraph.graphql'),
  'utf8',
);

/** Pre-fold hop floors (ff83774a) — fold must stay well below these. */
const PRE_FOLD_HTTP = {
  product_page: 331,
  search: 274,
  checkout: 173,
  order_history: 159,
} as const;

/**
 * Exact-deps-only ceilings (`344f8894`). Aggressive wave fold must beat these
 * on scenarios where exact-deps lagged the Hive Router Rust query planner
 * (especially `search`).
 */
const EXACT_DEPS_HTTP = {
  product_page: 71,
  search: 80,
  checkout: 71,
  order_history: 79,
} as const;

function countBackboneHttp(root: Parameters<typeof collectExecutableHops>[0]) {
  const hops: Parameters<typeof collectExecutableHops>[1] = [];
  collectExecutableHops(root, hops, {});
  return hops.filter(h => h.kind === 'Fetch' || h.kind === 'BatchFetch').length;
}

function countHiveRouterRustQueryPlannerFetches(plan: { node?: unknown }): number {
  let fetches = 0;
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    if (n.kind === 'Fetch' || n.kind === 'BatchFetch') fetches++;
    for (const v of Object.values(n)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(plan.node);
  return fetches;
}

/** Allow small slack vs Hive Router Rust query planner fetches (cardinality / fold shape noise). */
function hiveRouterRustQueryPlannerBandCeiling(hiveRouterRustQpFetches: number): number {
  return Math.ceil(hiveRouterRustQpFetches * 1.15) + 2;
}

describe('planning-large fold gates vs Hive Router Rust query planner', () => {
  it('keeps all four queries in the Hive Router Rust query planner fetch band and beats exact-deps on search', async () => {
    const { QueryPlanner } = await import('@graphql-hive/router-query-planner');
    const schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl: PLANNING_LARGE_SDL,
    });
    const hiveRouterRustQp = new QueryPlanner(PLANNING_LARGE_SDL);

    const names = Object.keys(QUERIES) as Array<keyof typeof QUERIES>;
    expect(names.sort()).toEqual(['checkout', 'order_history', 'product_page', 'search'].sort());

    const results: Record<
      string,
      {
        backbone: number;
        hiveRouterRustQp: number;
        ceiling: number;
      }
    > = {};

    for (const name of names) {
      const document = parse(QUERIES[name].replaceAll('__ID__', '1'));
      const op = document.definitions.find(d => d.kind === Kind.OPERATION_DEFINITION)!;
      const plan = buildStitchPlan(schema, op, getFragmentsFromDocument(document), {});
      expect(plan.incomplete).toBe(false);
      if (plan.incomplete) {
        throw new Error(`${name} incomplete: ${plan.incompleteReasons}`);
      }
      const backbone = countBackboneHttp(plan.root);
      const opName = op.name?.value ?? null;
      const hiveRouterRustQpPlan = hiveRouterRustQp.plan(
        QUERIES[name].replaceAll('__ID__', '1'),
        opName,
        new Set(),
        0,
      );
      const hiveRouterRustQpFetches = countHiveRouterRustQueryPlannerFetches(hiveRouterRustQpPlan);
      const ceiling = hiveRouterRustQueryPlannerBandCeiling(hiveRouterRustQpFetches);
      results[name] = {
        backbone,
        hiveRouterRustQp: hiveRouterRustQpFetches,
        ceiling,
      };

      // vs pre-fold: fold must be active on every scenario (all drop ≥2×)
      expect(backbone).toBeLessThanOrEqual(Math.floor(PRE_FOLD_HTTP[name] / 2));

      // vs Hive Router Rust query planner fetches
      expect(backbone).toBeLessThanOrEqual(ceiling);
    }

    // search discriminates exact-deps (80) vs gated (~48–58) vs Hive Router Rust query planner (54)
    expect(results.search!.backbone).toBeLessThanOrEqual(EXACT_DEPS_HTTP.search - 10);
    // Inline-fragment path dependsOn (Produces) puts nested entity hops after
    // path producers — search should be ≤ Hive Router Rust query planner fetches.
    expect(results.search!.backbone).toBeLessThanOrEqual(results.search!.hiveRouterRustQp);

    // product_page / checkout / order_history: aggressive should not regress
    // past exact-deps when already near the Hive Router Rust query planner band
    for (const name of ['product_page', 'checkout', 'order_history'] as const) {
      expect(results[name]!.backbone).toBeLessThanOrEqual(EXACT_DEPS_HTTP[name]);
    }
  }, 120_000);
});
