---
'@omnigraph/json-schema': minor
'@omnigraph/openapi': minor
'@graphql-mesh/transport-rest': patch
---

POSSIBLE BREAKING CHANGE WARNING:
  This change is breaking for OpenAPI schemas that have discriminator mapping.
  It fixes a bug when you have keys in the discriminator mapping that are invalid per GraphQL spec.
  Now in the artifacts `@discriminator` directive's `mapping` argument is `[String!]!` instead of `ObjMap`.
  You should make sure both the consumer and the producer of the artifacts are updated to this version.

```yaml
discriminator:
  propertyName: petType
  mapping:
    "pet-cat": '#/components/schemas/Cat'
    "pet-dog": '#/components/schemas/Dog'
```

This OpenAPI used to be translated into;

```graphql
@directive(mapping: { "pet-cat": "#/components/schemas/Cat", "pet-dog": "#/components/schemas/Dog" })
```

But this is invalid in GraphQL spec, so now it's translated into;

```graphql
@directive(mapping: [["pet-cat", "#/components/schemas/Cat"], ["pet-dog", "#/components/schemas/Dog"]])
```
