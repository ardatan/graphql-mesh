---
"@graphql-mesh/openapi": minor
---

Allow swagger docs that don't have defined schema refs. Right now whole app crashes if a schema is missing a $ref;


```ts
  /**
   * Allow processing to continue if the swagger schema is missing a schema $ref.
   */
  allowUndefinedSchemaRefTags?: boolean;

  /**
   * Object type to use for missing swagger schemas refs default is object.
   */
  defaultUndefinedSchemaType?: 'string' | 'number' | 'object' | 'array' | 'boolean' | 'integer';
```
