---
"@omnigraph/soap": major
---

- Require Node.js `>=22.18.0`
- Use `@graphql-hive/logger` directly; declare the dependency
- Drop Mesh cross-helpers; path via `globalThis.process?.getBuiltinModule`
