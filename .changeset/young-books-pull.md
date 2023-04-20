---
'@graphql-mesh/transform-encapsulate': minor
'@graphql-mesh/types': minor
---

If a schema defines root types which names are not the standard/expected ones ("Query", "Mutation"
and "Subscription") when using the encapsulation transform, the encapsulation will not succeed. The
proposed solution is to allow parameterizing the root type names, for the cases where they don't
follow the standard/expected ones. The new parameters are optional and have default values (the
"standard" values).
