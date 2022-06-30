---
"@graphql-mesh/config": patch
---

Fix: Resolve `customFetch` properly and write the import statement properly in the artifacts

If given `customFetch` path is relative, it wasn't reflected properly in the generated artifacts so artifacts were failing. Now it is resolved correctly based on the given working directory(`baseDir`).
