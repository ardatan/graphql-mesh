---
'@graphql-mesh/transform-filter-schema': minor
---

Introducing "bare" mode on filter schema.

** Breaking Changes **
Changed syntax for filtering field arguments.
This is done by declaring type name, field name and args:
`Query.user.!{pk, name}`
