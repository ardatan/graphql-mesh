# Canonical catalog workload reproduction

This deterministic replay runs the package's built candidate executor and Redis Lua adapter against
a virtual Redis, alongside an archived application-specific 60-second SKU/projection cache. The old
cache already reuses canonical SKUs across vendors within a process. It is not a vendor-keyed
baseline and is not the standard Mesh response-cache plugin.

From this package directory after a Bob build:

```sh
node benchmarks/reproduce.cjs
```

The development host runs that command through `/home/ltadmin/bin/cpu-slot.sh`. In a normal upstream
checkout the existing root native-preview compiler is used. The archived legacy fixture carries its
type-only store contract locally, so no other workspace build is required. No endpoint, credentials,
database or live application is required. Source code, public canonical operation projections and
seeded arrival distributions are included. The runner writes its own
`concurrent-4614-3600-1-upstream-reproduction.json` here.

The workload models 4,614 shared grocery SKUs, 500 vendors with 300 products each, three
independently warmed nodes, one internal and one public gateway per node, and 50 fleet
requests/second for one virtual hour. It reports the last 15 minutes after 45 minutes of warming:
45,000 requests. Workflow weights are shop/cart/order/inventory/POS 40/20/15/15/10%, with batches
24/6/6/25/8. Nine canonical corrections occur during the hour. Prices, stock and private operation
state are outside the cache.

The census-sized payload replay measured 38,601 legacy canonical fetches and 285,965 rows versus 154
fetches and 157 rows for a day cache with trusted invalidation (and the dependent event API):
99.601% fewer fetches and 99.945% fewer rows. Metadata JSON was 970,025,537 bytes versus 243,207:
99.975% fewer bytes. These are scenario counters, not promised improvements for arbitrary
applications or production load measurements. This portable runner reruns against the source patch
using `BENCHMARK_FIXTURE=census`; its result must be inspected rather than assumed to reproduce the
archived totals exactly.

Arrivals, source fill time (40 ms), noncache work (176 ms), eight source workers, stock overlap and
event delivery are modeled. Redis/network latency and actual SQL are not measured. Memory is logical
key/value accounting, not physical Redis usage. The 4,614-SKU scenario peaks near 52.6 MiB/node; a
separate 35,250-SKU unbounded replay needed 363.8 MiB/node, exceeding a 256 MiB Redis budget before
allocator overhead. Working sets and eviction can change the benefit substantially.

Separate read-only application evidence found native Strapi resolver batches of 24 products issue 1
SELECT for scalars, 49 for featured images, or 97 for featured images plus galleries. That probe
excludes HTTP/auth/document-service overhead. Source-media query improvements and a missing SKU
index are separate baseline issues; they can change the uncached cost. Avoided canonical reads are
not Galera write-set replication and do not establish total database or application capacity
improvements. The small real request sample of approximately 215 ms uncached versus 176 ms warm is
descriptive, not a tail-latency or capacity benchmark.

Private mixed roots still execute. Canonical row savings there can coexist with an unchanged source
HTTP call count. Exact projections, non-key arguments, schema revision and authorization scope
remain key dimensions. No projection-superset reuse, cross-region shared Redis, dollar savings or
production SLA is claimed.
