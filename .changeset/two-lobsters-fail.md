---
"@graphql-mesh/merger-bare": minor
"@graphql-mesh/merger-federation": minor
"@graphql-mesh/merger-stitching": minor
"@graphql-mesh/runtime": minor
"@graphql-mesh/transform-mock": minor
"@graphql-mesh/types": minor
---

Breaking change in merger API;

Before a merger should return a `GraphQLSchema`, not it needs to return `SubschemaConfig` from `@graphql-tools/delegate` package.
The idea is to prevent the schema from being wrap to reduce the execution complexity.
Now if merger returns an executor, it will be used directly as an executor inside Envelop's pipeline.
Also it can return `transforms` which will be applied during execution while schema transforms are applied on build time without any modification in the resolvers.

If there are some root transforms, those are applied together with the source transforms on the execution level in case of a single source.

