---
'@graphql-mesh/transport-rest': patch
---

Respect empty strings for dynamic headers

When an operation header as `"x-custom-header": "{args.myArg}"` is defined,
if `myArg` is `""`, then the header value should also be `""` not `null`.
