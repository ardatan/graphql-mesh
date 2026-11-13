---
"@graphql-mesh/incontext-sdk-codegen": patch
---

### Motivation

Dependabot’s Hive group bump pulled `@graphql-tools/wrap` / `delegate` to the `12.3.3` line and `@graphql-mesh/transport-http-callback@1.1.2` while Mesh still pinned older **patched** Hive packages. That left CI broken in two ways:

1. **Typecheck:** `fusion-runtime@1.13.3` nested `delegate@12.3.2` while `wrap@11.2.5` typed against `delegate@12.3.3` → `TS2345` in `incontext-sdk-codegen`.
2. **e2e:** unpatched `transport-http-callback@1.1.2` still imports `makeDisposable` from `@graphql-mesh/utils`, which Mesh no longer exports (use `DisposableSymbols` from `@whatwg-node/disposablestack`).

### What changed

- Port Mesh patches to the bumped packages:
  - `@graphql-mesh/fusion-runtime` `1.13.3` → `1.13.4`
  - `@graphql-hive/gateway-runtime` `2.13.3` → `2.13.4`
  - `@graphql-mesh/transport-http-callback` `1.1.1` → `1.1.2` (same `makeDisposable` → `DisposableSymbols.dispose` change)
- Point root resolutions at the new patches so Yarn does not nest `delegate@12.3.2` or ship an unpatched http-callback.

### Before / after

**Before (typecheck):**

```ts
// fusion-runtime@1.13.3 → nested delegate@12.3.2
// wrap@11.2.5 → delegate@12.3.3
mapSchema(wrapSchema(getSubschema(sourceName)), /* ... */);
// TS2345
```

**After:**

```ts
// fusion-runtime@1.13.4 + wrap@11.2.5 share delegate@12.3.3
mapSchema(wrapSchema(getSubschema(sourceName)), /* ... */);
```

**Before (e2e / http-callback):**

```js
import { makeDisposable } from '@graphql-mesh/utils';
return makeDisposable(httpCallbackExecutor, disposeFn);
```

**After:**

```js
import { DisposableSymbols } from '@whatwg-node/disposablestack';
httpCallbackExecutor[DisposableSymbols.dispose] = disposeFn;
return httpCallbackExecutor;
```

dependencies updates:
  - Updated dependency [`@graphql-mesh/fusion-runtime@patch:@graphql-mesh/fusion-runtime@npm%3A1.13.4#~/.yarn/patches/@graphql-mesh-fusion-runtime-npm-1.13.4-b65967c225.patch` ↗︎](https://www.npmjs.com/package/@graphql-mesh/fusion-runtime/v/3.0.0) (from `patch:@graphql-mesh/fusion-runtime@npm%3A1.13.3#~/.yarn/patches/@graphql-mesh-fusion-runtime-npm-1.13.3-efe60c8c1c.patch`, in `dependencies`)
  - Updated dependency [`@graphql-mesh/transport-common@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.1.2) (from `^1.1.1`, in `dependencies`)
  - Updated dependency [`@graphql-tools/wrap@^11.2.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/11.2.5) (from `^11.2.4`, in `dependencies`)
