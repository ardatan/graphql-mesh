# @omnigraph/mongo

## 0.1.0

### Major Changes

- Initial draft: Mongoose bootstrap emits hand-writable `@mongo` SDL for
  `@graphql-mesh/transport-mongo` (`kind: "mongo"`). First slice covers
  `FIND_ONE` / `FIND_MANY` / `COUNT` with `where` + `selection`.
