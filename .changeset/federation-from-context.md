---
'@graphql-tools/federation': minor
'@graphql-tools/stitch': minor
'@graphql-tools/delegate': patch
---

Support Federation `@context` / `@fromContext` (join v0.5 `contextArguments`) on the stitch backbone path.

When a supergraph field carries `@join__field(contextArguments: ...)`, Mesh reconstructs the hidden subgraph argument, plans a separate entity hop after the nearest `@context` ancestor is fetched, and injects the context value as a variable (grouping entities by distinct context tuples). Nullable multi-group hops alias `_entities_N` into one subgraph request; non-null contextual args keep one request per group. Contextual arguments stay off the public API schema. Bridge fields, response aliases, and interface ancestors are supported. `@context` providers, progressive-override labels, and the override handler are passed as `stitchSchemas` options from `getStitchingOptionsFromSupergraphSdl`. The backbone executor and progressive-override fields live flat on `stitchingInfo` (`backboneExecutor`, `overrideLabels`, `handleProgressiveOverride`), not as top-level `schema.extensions` keys or an options bag on `attachBackboneExecutor` / `createBackboneExecutor`.

**Migration:** no action for schemas without `@context` / `@fromContext`. Supergraphs composed with Federation join v0.5 `contextArguments` now resolve those fields on the Mesh stitch backbone. Clients must not pass contextual arguments (they are not part of the public schema). Callers that read `schema.extensions.backboneExecutor` or `stitchingInfo.backboneExecutorOptions`, or that passed an options bag to `attachBackboneExecutor` / `createBackboneExecutor`, should use `getBackboneExecutor(schema)` / `stitchingInfo.backboneExecutor` and set `overrideLabels` / `handleProgressiveOverride` via `stitchSchemas` (flat on `stitchingInfo`).
