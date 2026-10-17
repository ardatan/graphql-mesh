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

Source-event invalidation is a separate transport adapter. Events identify the configured source,
entity type, scope, identities and a stable source event ID. Only an exact event-ID replay is
ignored; a distinct older or equal-version event still fences the rows. Version is observational
metadata, not a reason to preserve a possibly stale cache row. Replay markers retain one hour; a
later replay safely causes an extra invalidation. One event batch is limited to 1,000 identities.
Global trusted invalidation is available without event metadata.

```ts
import { createEntityInvalidationWebhook } from '@graphql-mesh/plugin-entity-cache/webhook'

const events = createEntityInvalidationWebhook({
  invalidate: cache.invalidate,
  authenticate: request => verifySourceCredentials(request)
})
// defineConfig({ plugins: () => [cache.plugin, events] });
```

The adapter requires an application authentication callback, authenticates before reading a body,
and accepts POST on `/internal/entity-invalidate`. A body is limited to 64 KiB including streamed
input. A valid request resembles:

```json
{
  "v": 1,
  "source": "Assets",
  "entityType": "Equipment",
  "scope": "public-metadata",
  "identities": ["T23"],
  "event": { "id": "source-change-42", "version": 42 }
}
```

Success returns 204, malformed/unknown batches 400, failed authentication 401, unsupported methods
405, oversized bodies 413, and storage failures 503. Applications own credential verification, rate
limits, delivery retries and fan-out to every independently cached node. A successful authentication
callback grants authority for all registered scopes in this cache instance. A shared multi-producer
credential is insufficient for scope isolation. For producer-specific authority, restrict
authentication to one fixed producer and supply an `invalidate` wrapper with a fixed
source/type/scope allowlist for that producer, or use separate endpoints/cache instances. The
wrapper receives no request principal. Sharing mutable authentication state across concurrent
requests is unsafe. Dynamic per-request target authorization requires an application-owned
transport. The cache validates configured source/type membership; it does not infer authorization
from a caller-provided scope. Authentication service exceptions return an empty 503 response.

Missing deliveries can leave a row stale until its remaining TTL expires. Source-specific Vendure
SQL queues, Strapi hooks and change-data capture remain external adapters; neither framework is a
runtime dependency.

## Optional projection normalization

Default entries retain exact selection aliases and order. A trusted rule may optionally provide
`projection(field, schema): EntityProjection | null`, with a stable logical `key`, `encode(row)` for
canonical stored/coalesced rows and `decode(row)` for that caller's native response shape. Returning
null bypasses. Only explicitly proved equivalent projections may share a key; preserve field
sufficiency, arbitrary aliases, arguments/directives and resolved variable values. Selection
admission, schema fingerprint, revision, normalized non-key arguments and authorization scope still
partition entries. Bump the rule revision whenever the projection contract changes.

Executor requests retain original aliases, so source errors, extensions and streams keep their
native fallback. Callback input/output values are detached. Encoded rows are shared; each caller
decodes independently, including coalesced misses. Completeness checks see reconstructed caller
aliases with any injected identity retained; that hidden identity is stripped only for final output.
Callback exceptions bypass to the original source result/request. This hook does not infer privacy
or collapse arbitrary aliases. A consumer-owned non-Strapi Equipment fixture demonstrates an
explicit instrumentation-alias policy; no Strapi adapter is required by this package.

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
exists. Mutation fields must be registered; direct SQL/source writes need the event API or TTL
recovery. Entity keys are not invalidated across independent regional Redis stores without
authenticated fan-out.

Webhook authenticators that inspect or verify the body must read `request.clone()`. The original
Request body belongs to the bounded parser. A consumed or locked original body produces an empty 400
response and dispatches no invalidation.
