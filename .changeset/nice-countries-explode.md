---
"@graphql-mesh/graphql": minor
"@graphql-mesh/types": patch
---

**New `credentials` configuration option**

Previously it wasn't possible to configure `credentials` of outgoing `Request` object passed to `fetch`. And the default behavior was `same-origin`.
Now it is possible to configure it and you can also remove it completely for the environments (e.g. CF Workers) to avoid errors like `'credentials' hasn't been implemented yet` etc.

```yml
graphql:
  endpoint: ...
  credentials: disable
```
