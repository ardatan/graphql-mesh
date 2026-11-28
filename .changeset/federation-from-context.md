---
'@graphql-tools/federation': minor
'@graphql-tools/stitch': minor
'@graphql-tools/delegate': patch
---

Support Federation `@context` / `@fromContext` (join v0.5 `contextArguments`) on the stitch backbone path.

When a supergraph field carries `@join__field(contextArguments: ...)`, Mesh reconstructs the hidden subgraph argument, plans a separate entity hop after the nearest `@context` ancestor is fetched, and injects the context value as a variable (grouping entities by distinct context tuples). Nullable multi-group hops alias `_entities_N` into one subgraph request; non-null contextual args keep one request per group. Contextual arguments stay off the public API schema. Bridge fields, response aliases, and interface ancestors are supported. `@context` providers are passed as a `stitchSchemas` option onto `stitchingInfo.contextProviders`. Progressive-override labels/handler are closed over by `createBackboneExecutor` from `stitchSchemas` options (not stored on shared `stitchingInfo`). Stock execute uses root proxies that survive filter `mapSchema`; federation does not re-attach after filter. `getBackboneExecutor` is a per-schema WeakMap (not shared `stitchingInfo`), so attaching a derived schema cannot overwrite the original.

**Migration:** no action for schemas without `@context` / `@fromContext`. Supergraphs composed with Federation join v0.5 `contextArguments` now resolve those fields on the Mesh stitch backbone. Clients must not pass contextual arguments (they are not part of the public schema). Callers that read `schema.extensions.backboneExecutor`, `stitchingInfo.backboneExecutor`, `stitchingInfo.overrideLabels`, `stitchingInfo.handleProgressiveOverride`, or `stitchingInfo.backboneExecutorOptions` should use root proxies / `getBackboneExecutor(schema)` and pass `overrideLabels` / `handleProgressiveOverride` via `stitchSchemas` (closed over at attach).
