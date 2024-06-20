# @graphql-mesh/fusion-composition

## 0.0.6

### Patch Changes

- [#7009](https://github.com/ardatan/graphql-mesh/pull/7009)
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency
    [`@graphql-mesh/utils@^0.98.6` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.98.6)
    (to `dependencies`)
  - Added dependency
    [`graphql-scalars@^1.23.0` ↗︎](https://www.npmjs.com/package/graphql-scalars/v/1.23.0) (to
    `dependencies`)
  - Added dependency [`minimatch@^9.0.0` ↗︎](https://www.npmjs.com/package/minimatch/v/9.0.0) (to
    `dependencies`)

- [#7009](https://github.com/ardatan/graphql-mesh/pull/7009)
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0)
  Thanks [@ardatan](https://github.com/ardatan)! - Implement declarative transforms

- [#7054](https://github.com/ardatan/graphql-mesh/pull/7054)
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)
  Thanks [@ardatan](https://github.com/ardatan)! - Use `Disposable` pattern for plugins and
  transports

- [#7009](https://github.com/ardatan/graphql-mesh/pull/7009)
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0)
  Thanks [@User](https://github.com/User)! - Respect existing transformation done in the given
  subgraph schema

  If the given subgraph has the transformed elements with `@source` directive, then the composition
  should respect it;

  ```graphql
  type Query {
   @source(type: "MyUser") # This means `User` is actually `MyUser` in the actual subgraph
  }

  type User @source(name: "MyUser") {
    id: ID
    name: String
  }
  ```

- Updated dependencies
  [[`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`b5bf97c`](https://github.com/ardatan/graphql-mesh/commit/b5bf97c6fd92dbfa9ed88e03003910a1247149a0),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207),
  [`88d6232`](https://github.com/ardatan/graphql-mesh/commit/88d623289e187435ddc88bbe3f4623a727101207)]:
  - @graphql-mesh/utils@0.98.8

## 0.0.5

### Patch Changes

- [#7030](https://github.com/ardatan/graphql-mesh/pull/7030)
  [`270679b`](https://github.com/ardatan/graphql-mesh/commit/270679bb81046727ffe417800cbaa9924fb1bf5c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/schema@^10.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.4)
    (from `^10.0.2`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.2.1)
    (from `^10.2.0`, in `dependencies`)

## 0.0.4

### Patch Changes

- [`96dd11d`](https://github.com/ardatan/graphql-mesh/commit/96dd11d3c5b70a4971e56d47c8b200d4dc980f38)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump GraphQL Tools versions

## 0.0.3

### Patch Changes

- [#6872](https://github.com/ardatan/graphql-mesh/pull/6872)
  [`2fcadce`](https://github.com/ardatan/graphql-mesh/commit/2fcadce67b9acbcab2a14aa9ea57dbb84101f0b5)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Removed dependency [`pascal-case@^3.0.0` ↗︎](https://www.npmjs.com/package/pascal-case/v/3.0.0)
    (from `dependencies`)

## 0.0.2

### Patch Changes

- [#6602](https://github.com/ardatan/graphql-mesh/pull/6602)
  [`915b8f8`](https://github.com/ardatan/graphql-mesh/commit/915b8f8e56edc22515ca99e396f1c9d3b4e904b9)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency [`pluralize@^8.0.0` ↗︎](https://www.npmjs.com/package/pluralize/v/8.0.0) (to
    `dependencies`)

- [#6602](https://github.com/ardatan/graphql-mesh/pull/6602)
  [`915b8f8`](https://github.com/ardatan/graphql-mesh/commit/915b8f8e56edc22515ca99e396f1c9d3b4e904b9)
  Thanks [@ardatan](https://github.com/ardatan)! - Support `where.id_in` API (Graph Node subgraphs)

## 0.0.1

### Patch Changes

- [#6541](https://github.com/ardatan/graphql-mesh/pull/6541)
  [`a7984e5`](https://github.com/ardatan/graphql-mesh/commit/a7984e5ab214ddd7f75dca0f03b2e7e8ad768211)
  Thanks [@ardatan](https://github.com/ardatan)! - New Fusion packages
