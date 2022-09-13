---
'@graphql-mesh/cli': patch
'@graphql-mesh/merger-bare': patch
'@graphql-mesh/runtime': patch
---

- Do not assume scalars' types by using graphql-scalars
- Create unified executor only once at startup
- Respect predefined type definitions for scalars in the source types `.mesh/sources/SOURCE_NAME/types.ts` like `BigInt: bigint`
- Respect introspection fields correctly
