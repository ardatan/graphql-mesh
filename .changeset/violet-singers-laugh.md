---
'@graphql-mesh/serve-runtime': minor
---

Any schema source for proxy mode

Now you can directly provide a GraphQL schema, a path to an SDL or a URL to pull the schema from
when running in proxy mode.

### GraphQL schema

```ts
import { createServeRuntime } from '@graphql-mesh/serve-runtime'

export const runtime = createServeRuntime({
  proxy: {
    endpoint: 'http://upstream/graphql'
  },
  schema: /* GraphQL */ `
    type Query {
      hello: String
    }
  `
})
```

### Path

```ts
import { createServeRuntime } from '@graphql-mesh/serve-runtime'

export const runtime = createServeRuntime({
  proxy: {
    endpoint: 'http://upstream/graphql'
  },
  schema: './schema.graphql'
})
```

### URL

```ts
import { createServeRuntime } from '@graphql-mesh/serve-runtime'

export const runtime = createServeRuntime({
  proxy: {
    endpoint: 'http://upstream/graphql'
  },
  schema: 'https://my-cdn.com/graphql/schema'
})
```

### Hive CDN

```ts
import { createServeRuntime } from '@graphql-mesh/serve-runtime'

export const runtime = createServeRuntime({
  proxy: {
    endpoint: 'http://upstream/graphql'
  },
  schema: {
    type: 'hive',
    endpoint: 'https://cdn.graphql-hive.com/artifacts/v1/0123-3434/sdl',
    key: 'SOME_HIVE_KEY'
  }
})
```
