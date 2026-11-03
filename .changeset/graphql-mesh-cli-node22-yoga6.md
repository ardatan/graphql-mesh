---
"@graphql-mesh/cli": major
---

- Require Node.js `>=22.18.0`
- Generated artifacts import `AsyncDisposableStack` and use `fakePromise` / `fakeRejectPromise`
- Polling / serve paths fire-and-forget `destroy()` without unnecessary `await`
- Node builtins via `globalThis.process?.getBuiltinModule`
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
