---
'@graphql-mesh/compose-cli': minor
'@graphql-mesh/fusion-composition': minor
---

Optional Compose `routingUrl` writes `@join__graph(url:)` while `@transport(location:)` stays the upstream API.

### Why

Gateways and routers often need a served / join graph URL that differs from the upstream API endpoint stamped on `@transport(location:)`. Without a Mesh Compose option, that split had to be applied outside Compose (for example Router `routing_url` overlays).

### What changed

- **`subgraphs[].routingUrl`** on Mesh Compose config (`@graphql-mesh/compose-cli`): when set, Compose writes it to `@join__graph(url:)` and leaves `@transport(location:)` as the upstream endpoint from the loader or hand SDL.
- **`SubgraphConfig.url`** in `@graphql-mesh/fusion-composition` already carried the join URL; Compose no longer overwrites it with `@transport(location:)` or Connectors `@source(http.baseURL)`. Pure `http` transport is still dropped when the join URL matches location.

### Migration

Optional. Omit `routingUrl` for the previous behavior (join URL equals transport / source location).

```ts
// Before: join URL always followed @transport(location:)
subgraphs: [
  {
    name: 'users',
    sourceHandler: loadGraphQLHTTPSubgraph('users', {
      endpoint: 'http://upstream:8080/graphql',
    }),
  },
]

// After: join URL for the served subgraph; transport location stays upstream
subgraphs: [
  {
    name: 'users',
    routingUrl: 'http://localhost:4001/graphql',
    sourceHandler: loadGraphQLHTTPSubgraph('users', {
      endpoint: 'http://upstream:8080/graphql',
    }),
  },
]
```

Without Mesh Compose, keep using Router / overlay `routing_url` for the same split.
