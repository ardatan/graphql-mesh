---
"@graphql-mesh/postgraphile": major
---

- Require Node.js `>=22.18.0`
- Pool cleanup via `[DisposableSymbols.asyncDispose]`
- Node `path` via `globalThis.process?.getBuiltinModule` at use site
- Use Hive `Logger` / `PubSub` from original packages
