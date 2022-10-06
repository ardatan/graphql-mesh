---
'@graphql-mesh/config': patch
---

Support GraphQL Yoga plugins in declarative API

Now you can use any GraphQL Yoga plugin in Mesh configuration.

For example `@graphql-yoga/plugin-apollo-inline-trace` can be used like below;

```yml
plugins:
  - apolloInlineTrace: {}
```
