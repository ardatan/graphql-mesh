---
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/transport-connect': patch
'@graphql-mesh/runtime': patch
'@omnigraph/json-schema': patch
'json-machete': patch
---

Fix Connectors reprocess / multipart / entity-key edge cases and finalize type-level `@connect` attribution.

- Compose entity stamp: name-only single-arg fallback only for `String` arg + JSON-Schema `string` key
- `processDirectives({ preserveExistingFieldResolvers })` skips already-wired `@connect` fields (legacy `additionalTypeDefs` reprocess keeps rename proxies)
- Multipart takes precedence over raw-binary when a File arg is named `input`; `recoverInput` keeps live uploads (no `structuredClone` on File / `createReadStream`); multipart buffers `createReadStream` into `File` parts
- Empty unsupported-MIME body fallback only after a successful 0-byte drain
- Finalize type-level `@connect` prefers the sole keyed `@join__type` when a value-type sibling is present
- Opt-in JSON Schema `scalarMap` (title → scalar) for pattern scalars; FHIR e2e force-maps date/DateTime/URL/UUID/String/ID (incl. `oid`→`ID`) for a cleaner SG
- healJSONSchema: untitled enums (and array-item enums) under `$resolvedRef` get `{Definition}_{property}` titles so shared FHIR types (Duration, Extension, Timing_Repeat, …) stay identical across subgraphs — not operation-path names
- Compose finalize: dedupe native `@typescript`/`@regexp` on SCALAR/ENUM that only differ by `subgraph:` (Apollo Router rejects duplicate `@typescript`)
- JSON Schema loader: selection-driven emit — when an operation has a concrete `selection`, only those object properties become GraphQL fields (nested); unreferenced types are never composed. Escape with `schemaFields: 'all'` (loader or per-op). FHIR e2e drops its hard field whitelist and relies on this default.
