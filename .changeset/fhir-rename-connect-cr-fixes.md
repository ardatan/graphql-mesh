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
- Compose finalize: strip Mesh codegen `@typescript`/`@regexp`/`@example` apps (+ orphan defs/`@link` imports) from the lean SG — Apollo Router connector carry-over rejects duplicate `@typescript` on shared FHIR/OpenAPI pattern scalars
- FHIR e2e: full emit (no include / hard filter / compose snap); relative schema paths + `FHIR_BASE` env; inline `scalarMap`; operation `selection` = runtime `@connect` map only; hive + Router HAPI execution. Virtual `Reference.resource` Apollo-style hand SDL (`@link` + `@key`/`@connect` apps only) with generic `Resource` + `->match` literal `__typename` branches. Dropped unused SCHEMA `@source` / transport. fusion-runtime patch creates `kind: "connect"` for empty-join-URL virtual connectors.
