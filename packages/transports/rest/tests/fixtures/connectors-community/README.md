# Apollo Connectors Community fixtures

Vendored GraphQL schemas from
[apollographql/connectors-community](https://github.com/apollographql/connectors-community)
(`connectors/` directory).

Used by `packages/transports/rest/tests/connectors-community.test.ts` to smoke-load every community
connector through Mesh's `@connect` / `@source` executor wiring.

## Local patches

- `jira/connector.graphql`: upstream file starts with `xtend schema` (typo); fixed to
  `extend schema` so the SDL parses.
