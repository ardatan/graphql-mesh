---
'@graphql-mesh/cli': patch
---

Fix TS artifact generation when running Mesh build command so no reference to Mesh config script
files (TS/JS) are included in the built sources.
