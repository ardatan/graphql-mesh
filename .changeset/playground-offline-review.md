---
"@graphql-mesh/http": patch
"@graphql-mesh/cli": patch
"@graphql-mesh/types": patch
---

Do not silently fall back to CDN GraphiQL when `serve.playground.offline` is set without `renderGraphiQL`, and document that `@graphql-yoga/render-graphiql` must be installed in the app.
