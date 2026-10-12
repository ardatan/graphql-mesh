---
'@omnigraph/thrift': patch
'@omnigraph/odata': patch
'@omnigraph/json-schema': patch
'@omnigraph/openapi': patch
---

Omit empty and whitespace-only GraphQL descriptions from generated schemas so dependency bumps that print `description: ""` as `""""""` do not churn SDL/introspection metadata.
