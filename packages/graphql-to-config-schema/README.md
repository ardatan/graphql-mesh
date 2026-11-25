# `@ardatan/graphql-to-config-schema`

Build-time helper that turns Mesh YAML-config GraphQL SDL (`yaml-config.graphql`) into JSON Schema, TypeScript typings, and markdown docs.

Previously published from https://github.com/ardatan/graphql-to-config-schema; now maintained in this monorepo so it can track GraphQL 16/17 and modern `@graphql-tools/*`.

```bash
yarn generate-config-schema
# or
tsx packages/graphql-to-config-schema/src/bin.ts --schema './**/yaml-config.graphql' --json out.json
```
