---
'@graphql-mesh/cli': minor
'@graphql-mesh/http': minor
'@graphql-mesh/types': minor
---

feat: serve GraphiQL offline via `serve.playground.offline`

Air-gapped setups can bundle GraphiQL assets inline instead of loading them from a CDN:

```yaml
serve:
  playground:
    offline: true
```

`playground: true` / `false` is unchanged. Generated artifacts import `@graphql-yoga/render-graphiql` when offline mode is enabled.
