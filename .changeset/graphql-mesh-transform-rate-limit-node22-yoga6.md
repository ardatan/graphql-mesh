---
"@graphql-mesh/transform-rate-limit": major
---

- Require Node.js `>=22.18.0`
- Cleanup via `[DisposableSymbols.dispose]` for timeouts; `getMesh` registers disposable transforms with `disposables.use`
