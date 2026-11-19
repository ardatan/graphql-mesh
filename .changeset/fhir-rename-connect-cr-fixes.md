---
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/transport-connect': patch
'@graphql-mesh/runtime': patch
'@omnigraph/json-schema': patch
---

Fix Connectors reprocess / multipart / entity-key edge cases and finalize type-level `@connect` attribution.

- Compose entity stamp: name-only single-arg fallback only for `String` arg + JSON-Schema `string` key
- `processDirectives({ preserveExistingFieldResolvers })` skips already-wired `@connect` fields (legacy `additionalTypeDefs` reprocess keeps rename proxies)
- Multipart takes precedence over raw-binary when a File arg is named `input`; `recoverInput` keeps live uploads (no `structuredClone` on File / `createReadStream`); multipart buffers `createReadStream` into `File` parts
- Empty unsupported-MIME body fallback only after a successful 0-byte drain
- Finalize type-level `@connect` prefers the sole keyed `@join__type` when a value-type sibling is present
- Opt-in JSON Schema `scalarMap` (title → scalar) for pattern scalars; FHIR e2e maps only pattern-compatible primitives (`string`→`String`, `id`→`ID`, `instant`→`DateTime`)
