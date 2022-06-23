---
"@graphql-mesh/transform-filter-schema": patch
"@graphql-mesh/utils": patch
---

Replace micromatch with minimatch and remove file-path-to-url because both has Node specific dependencies which need polyfills and extra setup for non Node environments
