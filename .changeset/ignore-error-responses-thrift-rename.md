---
'@omnigraph/thrift': minor
'@omnigraph/json-schema': patch
---

### Why

Loader error modeling shares one flag name and polarity across protocols: `ignoreErrorResponses` (`true` = do not model protocol failures in the GraphQL result / throw-gate; `false` = model failures in GraphQL `data`). Thrift still used the older `ignoreExceptions` name.

### What

- **`@omnigraph/thrift`:** rename loader option `ignoreExceptions` -> `ignoreErrorResponses` (same polarity). Default stays `true`. No alias for the old name.
- **`@omnigraph/json-schema` (also OpenAPI / RAML options):** richer TSDoc for `ignoreErrorResponses`. **Defaults unchanged** (`false` / omitted still models non-2xx in the result).

### Migration

**Thrift**

Before:

```ts
loadThriftSubgraph('calc', {
  source: './calc.thrift',
  endpoint: 'http://localhost:8080/thrift',
  ignoreExceptions: false,
});
```

After:

```ts
loadThriftSubgraph('calc', {
  source: './calc.thrift',
  endpoint: 'http://localhost:8080/thrift',
  ignoreErrorResponses: false,
});
```

Omit the option (or set `true`) for the previous default throw behavior.

**OpenAPI / JSON Schema / RAML**

No config migration. Unset still models non-2xx response schemas. Set `ignoreErrorResponses: true` only when you want throw-only emit (skip non-2xx schemas).
