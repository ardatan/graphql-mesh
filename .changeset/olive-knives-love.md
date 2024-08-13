---
'@graphql-mesh/serve-cli': minor
---

Introduce `supergraph`, `subgraph` and `proxy` subcommands

Choose between different Mesh Serve modes using subcommands instead of deriving it using option
combinations.

Each of the commands accepts the `--help` argument which will help you understand what needs to be
supplied.

Defaults stay the same:

- Omitting the `schemaPathOrUrl` argument in `supergraph` subcommand will use the
  `supergraph.graphql`
- Omitting the `schemaPathOrUrl` argument in `subgraph` subcommand will use the `subgraph.graphql`

## Breaking Changes

There is no default command anymore, running just `mesh-serve` will display the help!

### Supergraph

```diff
- $ mesh-serve --supergraph <schemaPathOrUrl>
+ $ mesh-serve supergraph [schemaPathOrUrl]
```

### Subgraph

```diff
- $ mesh-serve --subgraph <schemaPathOrUrl>
+ $ mesh-serve subgraph [schemaPathOrUrl]
```

### Proxy

```diff
- $ mesh-serve --proxy <endpoint>
+ $ mesh-serve proxy <endpoint>
```
