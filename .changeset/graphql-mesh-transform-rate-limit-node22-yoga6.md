---
"@graphql-mesh/transform-rate-limit": major
---

- Require Node.js `>=22.18.0`
- Cleanup via `[DisposableSymbols.dispose]` for timeouts; `getMesh` registers disposable transforms with `disposables.use`
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
