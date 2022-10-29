# @omnigraph/soap

## 0.1.0

### Minor Changes

- [#3137](https://github.com/Urigo/graphql-mesh/pull/3137) [`672c62d50`](https://github.com/Urigo/graphql-mesh/commit/672c62d50526d0a076d18305be5b61dbb3018f62) Thanks [@ardatan](https://github.com/ardatan)! - **BREAKING**
  Rewrite SOAP Handler

  The generated API is completely different now because of the new handler. The new handler is based on the new `@omnigraph/soap` package.
  The fields in the generated schema now follows the XML structure.

### Patch Changes

- Updated dependencies [[`d5f2d950e`](https://github.com/Urigo/graphql-mesh/commit/d5f2d950e6318a74c062c9dbc436d5e9c0e8d59d)]:
  - @graphql-mesh/utils@0.42.4
  - @graphql-mesh/types@0.85.5
