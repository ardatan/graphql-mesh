---
"@graphql-mesh/cli": major
---

- Require Node.js `>=22.18.0`
- Generated artifacts import `AsyncDisposableStack` and use `fakePromise` / `fakeRejectPromise`
- Polling / serve paths fire-and-forget `destroy()` without unnecessary `await`
- Node builtins via `globalThis.process?.getBuiltinModule`
