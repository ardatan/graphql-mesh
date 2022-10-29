# @graphql-mesh/plugin-deduplicate-request

## 0.0.8

### Patch Changes

- Updated dependencies [[`d5f2d950e`](https://github.com/Urigo/graphql-mesh/commit/d5f2d950e6318a74c062c9dbc436d5e9c0e8d59d)]:
  - @graphql-mesh/utils@0.42.4
  - @graphql-mesh/types@0.85.5

## 0.0.7

### Patch Changes

- [#4748](https://github.com/Urigo/graphql-mesh/pull/4748) [`305dd2262`](https://github.com/Urigo/graphql-mesh/commit/305dd2262054f4173384c0af8f90e8879411bbe0) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`@whatwg-node/fetch@0.5.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.5.1) (from `0.5.0`, in `dependencies`)
- Updated dependencies [[`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd), [`bfedc23d9`](https://github.com/Urigo/graphql-mesh/commit/bfedc23d978089d15d9b67320fde0e6f5ac762fd)]:
  - @graphql-mesh/types@0.85.4
  - @graphql-mesh/utils@0.42.3

## 0.0.6

### Patch Changes

- [#4732](https://github.com/Urigo/graphql-mesh/pull/4732) [`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56) Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:
  - Updated dependency [`@graphql-mesh/types@0.85.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/types/v/0.85.2) (from `0.85.1`, in `dependencies`)
  - Updated dependency [`@graphql-mesh/utils@0.42.1` ↗︎](https://www.npmjs.com/package/@graphql-mesh/utils/v/0.42.1) (from `0.42.0`, in `dependencies`)
- Updated dependencies [[`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56), [`704a0bd6e`](https://github.com/Urigo/graphql-mesh/commit/704a0bd6e904b4f46a24f8844834adb3bd501e56)]:
  - @graphql-mesh/types@0.85.3
  - @graphql-mesh/utils@0.42.2

## 0.0.5

### Patch Changes

- [#4728](https://github.com/Urigo/graphql-mesh/pull/4728) [`c72d904dc`](https://github.com/Urigo/graphql-mesh/commit/c72d904dc11adfd3b6ee1695b1aaeae6ab64e1e9) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`@whatwg-node/fetch@0.5.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.5.0) (from `0.4.7`, in `dependencies`)
- Updated dependencies [[`09c286994`](https://github.com/Urigo/graphql-mesh/commit/09c28699441cda92f79e4e9b8464e7be5f46a786)]:
  - @graphql-mesh/types@0.85.2
  - @graphql-mesh/utils@0.42.1

## 0.0.4

### Patch Changes

- [`3268f94f7`](https://github.com/Urigo/graphql-mesh/commit/3268f94f7794fc3fbf049e3aa5d78bee48873b8d) Thanks [@ardatan](https://github.com/ardatan)! - Fix context null check

## 0.0.3

### Patch Changes

- Updated dependencies [[`398af2bf6`](https://github.com/Urigo/graphql-mesh/commit/398af2bf602182ca315bc8d99d2237ad1a16ee48), [`1d61fbcec`](https://github.com/Urigo/graphql-mesh/commit/1d61fbcecb8d5b286bb1c2e727bdf7d233c566da)]:
  - @graphql-mesh/types@0.85.1
  - @graphql-mesh/utils@0.42.0

## 0.0.2

### Patch Changes

- [`c82a1c158`](https://github.com/Urigo/graphql-mesh/commit/c82a1c15873f59837a670186590d0723e5574d11) Thanks [@ardatan](https://github.com/ardatan)! - Clone Response for deduplication instead of reading it first, it no longer needs accept header to be json

## 0.0.1

### Patch Changes

- [#4698](https://github.com/Urigo/graphql-mesh/pull/4698) [`858135646`](https://github.com/Urigo/graphql-mesh/commit/8581356462ae06b2acff96330aabf458f21e7a63) Thanks [@ardatan](https://github.com/ardatan)! - **BREAKING**

  Previously HTTP Caching was respected by GraphQL Mesh by default. Now this has been seperated into a different plugin. Please check our docs if you want to bring this functionality back in your gateway.

  [HTTP Caching Plugin](/docs/plugins/http-cache)

  Previously some details about underlying HTTP requests were exposed via `includeHttpDetailsInExtensions: true` flag or `DEBUG=1` env var. Now you need to install this plugin to get the same functionality;

  [HTTP Details in Extensions Plugin](/docs/plugins/http-details-extensions)

  Previously Mesh automatically deduplicate the similar HTTP requests per GraphQL Context by default, now you need to install the following plugin;

  [Deduplicate HTTP Requests Plugin](/docs/plugins/deduplicate-request)
