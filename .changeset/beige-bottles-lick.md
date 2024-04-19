---
"@graphql-mesh/compose-cli": minor
---

Rename `target` option to `output` in order to be more clear that it's the output file.

```diff
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { defineConfig } from '@graphql-mesh/compose-cli';

export const composeConfig = defineConfig({
- target: 'fusiongraph.graphql',
+ output: 'fusiongraph.graphql',
  subgraphs: [
    {
      sourceHandler: () => ({
        name: 'helloworld',
        schema$: new GraphQLSchema({
          query: new GraphQLObjectType({
            name: 'Query',
            fields: {
              hello: {
                type: GraphQLString,
                resolve: () => 'world',
              },
            },
          }),
        }),
      }),
    },
  ],
});
```
