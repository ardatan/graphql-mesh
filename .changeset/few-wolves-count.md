---
"@graphql-mesh/openapi": minor
"@graphql-mesh/container": patch
"json-machete": patch
"@graphql-mesh/types": patch
---

## Breaking changes

OpenAPI has been completely rewritten based on JSON Schema handler from scratch. It's now more stable and supports more features. However, it produces different output and takes different configuration options.

Please check the migration guide to learn how to migrate your existing OpenAPI handler configuration.
[Migration Guide from 0.31 to 0.32](https://www.graphql-mesh.com/docs/migration/openapi-0.31-0.32)

This rewrite has been done under `@graphql-mesh/new-openapi` name so far, and you can check its changelog to see the progress.
[`@graphql-mesh/new-openapi`'s `CHANGELOG`](https://github.com/Urigo/graphql-mesh/blob/99b5691e216b1ae7f46c3db1b3e91345e5351df8/packages/handlers/new-openapi/CHANGELOG.md)

