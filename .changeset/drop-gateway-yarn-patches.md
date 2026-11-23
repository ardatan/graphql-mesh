---
'@graphql-mesh/incontext-sdk-codegen': patch
---

Drop Hive Gateway yarn patches now that the upstream releases include the join-transport / connect-infer / http-callback fixes.

### Why

Mesh was pinning patched copies of `@graphql-mesh/fusion-runtime`, `@graphql-hive/gateway-runtime`, and `@graphql-mesh/transport-http-callback` while Hive Gateway #2774 was in flight. Those packages are published; the patches are no longer needed.

### What changed

- Resolve `@graphql-mesh/fusion-runtime` `^1.15.0`, `@graphql-hive/gateway-runtime` `^2.14.3`, and `@graphql-mesh/transport-http-callback` via published npm (no `.yarn/patches` for those).
- Pin `@graphql-hive/gateway` to `2.15.12` (examples/e2e caret ranges bumped to `^2.15.12`).
- Align `@graphql-tools/delegate` to `12.3.5` and `@graphql-tools/wrap` to `11.2.7` so Mesh and the published fusion-runtime share one type identity.

### Migration

Upgrade Hive Gateway / related Mesh runtime packages to the versions above and remove any local yarn patches that mirrored Hive Gateway #2774. No Mesh API changes.
