---
'@graphql-mesh/types': patch
'@graphql-mesh/plugin-mock': patch
---

Fix the behavior matching the documentation

Now `custom` property accepts a factory function or the value directly.
Previously it was just the path to the module with the export (`./module.ts#exportName`)
