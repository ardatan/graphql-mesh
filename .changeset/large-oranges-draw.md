---
'@graphql-mesh/openapi': patch
'@graphql-mesh/grpc': patch
'@graphql-mesh/raml': patch
'@omnigraph/openapi': patch
'@graphql-mesh/types': patch
'@omnigraph/grpc': patch
'@omnigraph/raml': patch
---

New option `selectQueryOrMutationField` to decide which field belongs to which root type explicitly.

```ts filename="mesh.config.ts"
import loadGrpcSubgraph from '@omnigraph/grpc'
import { defineConfig } from '@graphql-mesh/compose-cli'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGrpcSubgraph('MyGrpcApi', {
        /** .. **/

        // Prefix to collect Query method default: list, get
        prefixQueryMethod: ['list', 'get'],

        // Select certain fields as Query or Mutation
        // This overrides `prefixQueryMethod`
        selectQueryOrMutationField: [
          {
            // You can use a pattern matching with *
            fieldName: '*RetrieveMovies',
            type: 'Query',
          },
          // Or you can use a specific field name
          // This will make the field GetMovie available as a Mutation
          // Because it would be Query because of `prefixQueryMethod`
          {
            fieldName: 'GetMovie',
            type: 'Mutation'
          }
        ]
      })
    }
  ]
});
```
