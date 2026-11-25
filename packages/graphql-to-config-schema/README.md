# `@graphql-mesh/config-schema`

Build-time helper that turns Mesh YAML-config GraphQL SDL (`yaml-config.graphql`) into JSON Schema, TypeScript typings, and markdown docs.

Successor to `@ardatan/graphql-to-config-schema`, maintained in this monorepo so it can track GraphQL 16/17 and modern `@graphql-tools/*`.

CLI binary: `graphql-to-config-schema`

```bash
yarn generate-config-schema
# or
tsx packages/graphql-to-config-schema/src/bin.ts --schema './**/yaml-config.graphql' --json out.json
```
