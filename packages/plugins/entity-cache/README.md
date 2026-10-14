# Delegated entity cache

Opt-in entity-level reuse at Hive Gateway's `onSubgraphExecute` hook. The unit is a canonical entity
and exact projection, rather than an entire operation. This covers batched Mesh `@resolveTo` and
stitching `@merge` lookups without requiring a particular source framework.

The cache requires an explicit rule for each source lookup. A rule provides identity extraction, a
safe key-batch mapping, selection admission, authorization scope, lookup-order semantics and an
explicit `isComplete(rows, requestedKeys, args)` proof. A missing predicate bypasses. The proof
receives actual rewritten arguments for a miss subset and original arguments when validating
combined cached groups. A full-key rewrite must preserve the original source arguments; otherwise
the lookup bypasses. Only an exact true result admits a source batch or serves combined cached
groups. The predicate must prove complete positive groups and genuine absence, not merely validate
returned identities. For a capped lookup, conservatively require `rows.length < args.limit` (or the
source's effective pagination limit). At saturation, return the original batch and cache no partial
groups or missing identities. Aggregate cached rows must also pass the original request's
completeness proof. Bump the rule revision when adding or changing completeness semantics so
previously admitted partial groups or false negatives cannot remain reachable. Never use a public
scope for ownership, permissions, tenant-specific prices, live stock or user data. A scope callback
can return `null` to bypass. Schema fingerprints, rule revision, normalized non-key arguments and
exact selections partition entries. Custom scalar inputs, unsupported fragments/directives and
collection semantics bypass conservatively.

```ts
import { createEntityCache } from '@graphql-mesh/plugin-entity-cache'
import { createRedisEntityStore } from '@graphql-mesh/plugin-entity-cache/redis'

const cache = createEntityCache({
  store: createRedisEntityStore(redis, 'equipment-v1'),
  rules: [
    {
      source: 'Assets',
      field: 'equipmentMetadata',
      revision: 'public-v1',
      entityType: 'Equipment',
      ttlSeconds: 86400,
      negativeTtlSeconds: 10,
      identityField: 'assetTag',
      ordering: 'key-grouped',
      isComplete: () => true, // This source returns exhaustive groups without a result cap.
      scope: () => 'public-metadata',
      selection: field =>
        !!field.selectionSet &&
        field.selectionSet.selections.every(
          node => node.kind === 'Field' && ['assetTag', 'description'].includes(node.name.value)
        ),
      batch: args =>
        Array.isArray(args.tags) && Object.keys(args).length === 1
          ? { keys: args.tags, withKeys: tags => ({ tags }) }
          : null,
      identity: row => (typeof row?.assetTag === 'string' ? row.assetTag : null),
      mutationFields: ['updateEquipment']
    }
  ]
})
// defineConfig({ plugins: () => [cache.plugin] });
```

Use a dedicated bounded node-local Redis, shared by gateway processes on that node. Separate nodes
warm independently. Redis admission rejects an entry over 64 KiB. TTL is bounded at one day;
negative TTL defaults to at most ten seconds. Configure Redis capacity/eviction outside the plugin.
Projection count and arguments multiply the working set. `createMemoryEntityStore` is a bounded
reference store for tests and single-process use, not distributed storage.

`EntityStore` is deliberately stronger than Mesh `KeyValueCache`: snapshots and compare-and-set
writes must be atomic with invalidation. Random fence incarnations prevent old rows becoming valid
after Redis eviction/expiry recreates a generation counter. Recognized mutations fence the
configured type/scope before and after execution, including named operations and fragments. A failed
fence makes that gateway instance bypass for the maximum row TTL. Read/write failures fail open to
the original source request. A cache outage requires operational monitoring; configured callbacks
and source events still determine freshness.

Mixed source requests keep private roots fresh. On a complete canonical hit, only the admitted root
is omitted from the source document and restored in the result. Partial hits and unexpected/error
results refetch the original full request to preserve error paths, null bubbling and caller-private
values. The plugin does not cache a complete operation or private roots.

This first change provides read caching, mutation fencing and generic invalidation plumbing. A
dependent change adds bounded authenticated source-event invalidation. Raw external requests must
never call `cache.invalidate` without authentication. The base API is for trusted in-process
invalidation; source-specific CDC, retries and event fan-out remain adapters.

## Validation

The native Jest suites cover cache admission/isolation, exact shapes, scalar/default coercion,
partial errors, streams, concurrent fills, in-flight invalidation, named mutation selection, mixed
private roots, TTL and fence expiry. Delegation fixtures execute actual non-Strapi `@resolveTo` and
stitching `@merge` through Hive's executor hook. Opt-in Redis tests use a random namespace and only
delete that namespace.

## Limitations

Node 20 or later is required by crypto and the Redis adapter. Redis Cluster scripts spanning hash
slots and edge-runtime storage are not supported by this adapter. Collection queries,
connection/sort/direct-ID shapes and unsupported projections bypass until an explicit safe rule
exists. Mutation fields must be registered; direct SQL/source writes need the dependent event API or
TTL recovery. Entity keys are not invalidated across independent regional Redis stores without
authenticated fan-out.
