---
"@omnigraph/soap": patch
---

Support extended enum types, before it was supporting `string` only but it might be other types of enums which are not string.
In GraphQL, there is not such a thing like `Enum<T>` so all enums are just enums.
