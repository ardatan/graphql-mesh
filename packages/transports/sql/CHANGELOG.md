# @graphql-mesh/transport-sql

## 0.1.0

### Major Changes

- Initial release: execute `@sql` with transport `kind: "sql"` (sqlite / mysql / postgres).
  Type-level `@sql` wires Federation `resolveReference` + `Query._entities`; ROW/ROWS equality
  lookups are DataLoader-batched.
