---
"@omnigraph/grpc": major
---

- Require Node.js `>=22.18.0`
- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule`
- Throw instead of `Promise.reject` for invalid `includeDirs`
