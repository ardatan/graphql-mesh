---
'@graphql-mesh/compose-cli': minor
---

Add `introspectionOptions` to `loadGraphQLHTTPSubgraph` with some defaults.
Previously, it was not possible to configure the introspection query options.
By default it was ignoring deprecated input fields and not including descriptions.
Now it includes descriptions and deprecated input fields by default.
And you can still override the defaults by providing your own options.

```ts
import { loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli';

loadGraphQLHTTPSubgraph('my-subgraph', {
  source: 'http://my-subgraph/graphql',
  introspectionOptions: {
    descriptions: true,
    specifiedByUrl: false,
    directiveIsRepeatable: false,
    schemaDescription: false,
    inputValueDeprecation: true,
    oneOf: false, // New in GraphQL 16
  },
});
```
