---
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/transport-connect': patch
'@graphql-mesh/runtime': patch
'@omnigraph/json-schema': patch
'json-machete': patch
'@graphql-mesh/string-interpolation': patch
---

Fix Connectors reprocess / multipart / entity-key edge cases and finalize type-level `@connect` attribution.

- Compose entity stamp: name-only single-arg fallback only for `String` arg + JSON-Schema `string` key
- `processDirectives({ preserveExistingFieldResolvers })` skips already-wired `@connect` fields (legacy `additionalTypeDefs` reprocess keeps rename proxies)
- Multipart takes precedence over raw-binary when a File arg is named `input`; `recoverInput` keeps live uploads (no `structuredClone` on File / `createReadStream`); multipart buffers `createReadStream` into `File` parts
- Empty unsupported-MIME body fallback only after a successful 0-byte drain; nonempty unsupported MIME (e.g. Wiki `image/png`) drains via `arrayBuffer` then maps `$` → `null` (Apollo Connectors parity)
- Finalize type-level `@connect` prefers the sole keyed `@join__type` when a value-type sibling is present
- Opt-in JSON Schema `scalarMap` (title → scalar) for pattern scalars; FHIR e2e force-maps date/DateTime/URL/UUID/String/ID (incl. `oid`→`ID`) for a cleaner SG
- healJSONSchema: untitled enums (and array-item enums) under `$resolvedRef` get `{Definition}_{property}` titles so shared FHIR types (Duration, Extension, Timing_Repeat, …) stay identical across subgraphs — not operation-path names; skip `type: boolean` (FHIR `deceasedBoolean` pattern) so Boolean cleanup still removes the pattern
- Compose finalize: strip Mesh codegen `@typescript`/`@example` apps from the lean SG (Router rejects duplicate `@typescript`); **keep `@regexp`** for Connect `processScalarType` runtime validation
- JSON Schema `@connect(selection:)`: when passthrough visit-budget truncates mid-type, rebuild with soft-depth `leavesOnly` before `$`; cycle-only omission keeps sibling nests (no rebuild)
- Connect path templates: normalize percent-encoding (`encodePathTemplateValue`) so Wiki pre-encoded titles are not double-encoded (`%253F`)
- Connect XML: sniff `<?xml` on `text/plain` responses (Node `Response(string)` defaults Content-Type) before treating body as Apollo plain text
- Compose entity stamp: `String` path arg + `ID` key field (FHIR `scalarMap.id → GraphQLID`) gets `@connect(entity: true)` / `@key` like the `string` pattern-scalar case
- FHIR e2e: pin schema download to HL7 **R4** zip (`https://hl7.org/fhir/R4/fhir.schema.json.zip`); invalidate cache unless `Patient.id` → `#/definitions/id` **and** `Observation.status` is an inline enum; extract via system `unzip` (avoid `unzip-stream` SIGSEGV on Node 26)
- FHIR e2e: full emit; `process.env.FHIR_BASE` at compose; inline `scalarMap`; hive + Router HAPI execution. Join-only `./reference-resource.graphql`. Legacy `.meshrc.yml` keeps Mesh `@resolveTo` with `sourceArgs` split via `{root.reference|path_head}` / `{root.reference|path_rest}`; endpoint `{env.FHIR_BASE}`
- string-interpolation: `path_head` / `path_rest` modifiers for `Type/id` refs in Mesh `sourceArgs`
- `processDirectives({ preserveExistingFieldResolvers })`: mark Mesh-generated abstract `resolveType` callbacks; rebuild when union/interface members change; leave application-provided callbacks unchanged
