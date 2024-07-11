---
'@graphql-mesh/fusion-runtime': patch
'@graphql-mesh/compose-cli': patch
---

Fix the bug;
When a non-nullable field is added through `additionalTypeDefs` in the compose config,
then the gateway fails to resolve it even if a resolver defined in `additionalResolvers`;

```ts
export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Wiki', {
        source: 'https://wikimedia.org/api/rest_v1/?spec',
        endpoint: 'https://wikimedia.org/api/rest_v1',
      }),
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type pageview_project {
      banana: String
      apple: String!
    }
  `,
});

export const serveConfig = defineServeConfig({
  additionalResolvers: {
    pageview_project: {
      banana() {
        return '🍌';
      },
      apple() {
        return '🍎'; // This is ignored
      }
    },
  },
});
```
