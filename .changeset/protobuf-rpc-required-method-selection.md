---
'@omnigraph/protobuf': minor
'@graphql-mesh/transport-protobuf': minor
'@graphql-mesh/fusion-composition': patch
---

Breaking (0.x): `@protobuf__rpc` now requires `method: String!` and `selection: String!` (aligned with the published protobuf family SDL and runtime binding).

### Why

The specs host and loader stamped `method` / `selection` as optional, but every executable binding needs a non-empty method name and a selection mapping. Hand-authored SDL that omitted them only failed later at transport setup.

### What changed

- Loader `protobufRpcDirective` and `specs/content/protobuf/v0.1` mark `method` and `selection` as non-null.
- Transport rejects apps missing `method` (or with an empty method) and missing `selection`.
- `args` stays optional so empty request messages can omit it (same empty-omit pattern as Thrift).
- Join finalize (`prepareJoinDirectiveArgs`) still omits empty `args: ""`, but keeps empty `selection: ""` so an empty-response RPC is not mistaken for a missing selection after reconstitution.

### Migration

On every `@protobuf__rpc` application, always set `method` and `selection`. Example:

```graphql
type Query {
  moviesByYear(year: Int!): MoviesResult!
    @protobuf__rpc(
      service: "Example"
      method: "GetMovies"
      args: """
        1(message): $args {
          2(int64): $args.year
        }
      """
      selection: """
        1(repeated message): result {
          1(string): name
          2(int64): year
        }
      """
    )
}
```

Omit `args` only when the RPC request message is empty. Loader-generated schemas already emit both required args.
