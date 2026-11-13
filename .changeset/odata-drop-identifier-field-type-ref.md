---
'@omnigraph/odata': minor
---

## Motivation

OData `@entityInfo` carried codegen leftovers that hurt hand-authored SDL, and the remaining `identifierFieldName` duplicated Federation’s `@key(fields)`:

1. `identifierFieldTypeRef` (`Edm.String`, …) — never read by `addIdentifierToUrl`; the GraphQL key arg scalar already describes the key.
2. `actualFields` / `navigationFields` — string lists duplicating field directives (`@navProp` / `@pluralNav` / `@singularNav`).
3. `isOpenType` + hard-coded `rest: JSON` — open-type catch-all was a type boolean plus a collision-prone field name; OpenAPI already uses `additionalProperties`.
4. `identifierFieldName` — same information as Federation `@key(fields)`; keep one representation.

## What changed

- Removed `identifierFieldTypeRef` from `@entitySetByIdentifier`, `@deleteEntitySet`, and `@updateEntitySet` (and from the removed `@entityInfo`).
- Removed `actualFields` and `navigationFields`; `$select` / `$expand` infer field kind from directives (`entityFieldKind`). `@singularNav` is not an `$expand` path.
- Removed `@entityInfo` entirely.
- Entity keys emit Federation-compatible `@key(fields: "…")` (repeatable; optional `resolvable`). Runtime (`$select`, `@odata.id`, singular nav) reads `@key`.
- OpenType entities emit `additionalProperties: JSON @resolveRoot` (output) and `additionalProperties: JSON` (input) instead of `rest`. `rebuildOpenInputObjects` merges that bag on create/update.

This does **not** auto-wire Federation `_entities` / entity resolvers; `@key` is the shared key metadata for OData URLs and for composition when you opt into Federation.

## Migration

Regenerate OData schemas, or edit hand-written SDL:

1. **Before removing `navigationFields`**, add `@pluralNav` / `@navProp` / `@singularNav` on every listed field. Without a marker, the field goes to `$select` instead of `$expand`.
2. Delete `navigationFields`, `actualFields`, `identifierFieldTypeRef`, and `isOpenType` from directives.
3. Replace `@entityInfo(identifierFieldName: "…")` with `@key(fields: "…")`. Drop bare `@entityInfo` on keyless complex types.
4. Rename open-type bag `rest` → `additionalProperties` and put `@resolveRoot` on the output field.

### Keys

```graphql
# before
type Person @entityInfo(identifierFieldName: "UserName") {
  UserName: String
}

# after
type Person @key(fields: "UserName") {
  UserName: String
}
```

### Nav fields

```graphql
# before (unsafe after this change)
type Person @entityInfo(navigationFields: ["Friends"], …) {
  Friends: [Person]
}

# after
type Person @key(fields: "UserName") {
  Friends: [Person] @pluralNav(navigationPropertyName: "Friends")
}
```

### Open types

```graphql
# before
type OpenEntity @entityInfo(isOpenType: true, identifierFieldName: "id") {
  id: ID!
  rest: JSON @resolveRoot
}

# after
type OpenEntity @key(fields: "id") {
  id: ID!
  additionalProperties: JSON @resolveRoot
}
```
