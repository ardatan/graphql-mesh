---
"@graphql-mesh/postgraphile": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

PostGraphile / pg pools used to close when Mesh published `destroy` or when a `disposables` option was injected. Both were easy to skip in custom `getMesh` / Gateway embeddings, leaking connections under load. The handler now implements `[DisposableSymbols.asyncDispose]` so runtime disposal is mandatory and obvious.

## What changed

- Tear down PostGraphile / pg pools via `[DisposableSymbols.asyncDispose]`
- No injected `disposables` constructor option
- Hive `Logger` / `PubSub` types from their packages
- Node `path` via `globalThis.process?.getBuiltinModule` at use site

## How to migrate

1. Remove `disposables` from handler constructors.
2. Pass the handler through `getMesh` (auto `disposables.use`) or register it yourself.
3. Stop relying on destroy-pubsub subscribers for connection cleanup.

#### Example
```ts
import Handler from '@graphql-mesh/postgraphile'

const handler = new Handler({
  name: 'API',
  config: { /* source-specific */ },
})
disposables.use(handler)
```
