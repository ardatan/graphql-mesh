---
"@graphql-mesh/config": minor
---

Directives Approach for Additional Type Definitions and Resolvers;

Before we use declarative approach for `additionalResolvers` that is added besides `additionalTypeDefs` which might be confusing once the project grows.
And now we introduce new `@resolveTo` directive which has the same declarative syntax inside the SDL instead of the configuration file.

Before;

```yaml
additionalTypeDefs: |
  extend type Book {
    author: Author
  }

additionalResolvers:
  - targetTypeName: Book
    targetFieldName: author
    sourceName: Author
    sourceTypeName: Query
    sourceFieldName: authorById
    requiredSelectionSet: "{ id }"
    sourceArgs:
      id: "{root.id}"
```

After:

```graphql
extend type Book {
  author: Author @resolveTo(
    sourceName: "Author",
    sourceTypeName: "Query",
    sourceFieldName: "author",
    requiredSelectionSet: "{ id }",
    sourceArgs:
      id: "{root.id}"
  )
}
```
