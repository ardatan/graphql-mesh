---
'@graphql-mesh/serve-runtime': minor
---

MeshServeConfig doesnt have the `hive` property anymore

Hive's usage reporting can be used with any of serve modes (supergraph, subgraph and proxy), while
Hive CDN usage has more integrated configuration.

### Usage reporting

```diff
import { createServeRuntime } from '@graphql-mesh/serve-runtime'

export const runtime = createServeRuntime({
  supergraph: 'supergraph.graphql',
- hive: {
-   token: '<hive-registry-token>'
- },
+ reporting: {
+   type: 'hive',
+   token: '<hive-registry-token>'
+ }
})
```

### Supergraph from Hive CDN

```diff
import { createServeRuntime } from '@graphql-mesh/serve-runtime'

export const runtime = createServeRuntime({
- hive: {
+ supergraph: {
+   type: 'hive',
    endpoint: '<hive-endpoint>',
    key: '<hive-cdn-key>'
  }
})
```

### Proxy with schema from Hive CDN

```diff
import { createServeRuntime } from '@graphql-mesh/serve-runtime'

export const runtime = createServeRuntime({
  proxy: '<endpoint>',
- hive: {
+ schema: {
+   type: 'hive',
    endpoint: '<hive-endpoint>',
    key: '<hive-cdn-key>'
  }
})
```
