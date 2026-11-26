# Hive Gateway performance benches (Mesh-owned packages)

Package-level federation/stitch benches from Hive Gateway live here and run in Mesh CI
(`.github/workflows/bench.yml`).

They exercise Mesh-owned packages (`@graphql-tools/federation`, `delegate`, `executor`, …) with the
same Apollo Gateway vs stitching comparison that Gateway used under `bench/federation`.

Gateway full-stack e2e benches/memtests remain in `graphql-hive/gateway`. Mesh also runs a **Gateway
memtest** impact job (`.github/workflows/gateway-memtest.yml`) that builds these packages and
portals them into a Gateway checkout for federation-related leak scenarios.

```bash
yarn build
yarn bench
```

CI duration knobs: `BENCH_DURATION`, `BENCH_WARMUP_TIME`, `BENCH_WARMUP_ITERATIONS`.

## Suites

- `bench/federation/federation.bench.ts` — in-process Stitching
  (`getStitchedSchemaFromSupergraphSdl`) vs Apollo Gateway (LocalGraphQLDataSource). No HTTP, no
  Hive Gateway binary.
- `bench/federation-example/federation-example.bench.ts` — HTTP load against `@graphql-hive/gateway`
  binary, Tools QP vs `HIVE_ROUTER_RUNTIME` (needs `@graphql-hive/router-runtime`). Ported from
  Gateway `e2e/federation-example/federation-example.bench.ts`.
