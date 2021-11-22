---
id: build-mesh-artifacts
title: Build Artifacts
sidebar_label: Build Artifacts
---

## Build & Validate Mesh Artifacts

After you tested your Mesh with `dev` command, it is time to build Mesh artifacts for advanced usage with the following command.

```sh
yarn mesh build
```

### Why you should build Mesh artifacts?

With `dev` command, GraphQL Mesh fetches your remote data sources at runtime, during initialisation, to retrieve their raw schema and potentially translate it into GraphQL (when relevant).  
However, to reduce dependencies at runtime, GraphQL Mesh allows you to cache the raw schema of your remote data sources so they are locally available at runtime.  
This is important because if, for instance, one of the data sources you consume experiences downtime when your GraphQL Mesh server is starting, this would cause a failure and will ultimately force you to restart your server; effectively making this unavailable until you're able to start it successfully (in this case, only when all your data sources can provide their raw schemas).  
By following the steps below, you can instead move this dependency from runtime to build-time, by invoking a command that downloads the remote schemas and save them into a local file to be used as cache during server initialisation. In this case if one of your remote resources is not available when you attempt to build this local cache, it would cause a build failure which will stop your deployment process; hence not affecting your service availability.

### Run Mesh Gateway safely without relying on the sources

Mesh is now able to start a GraphQL Server, and it doesn't need other services running.

```sh
yarn mesh start
```

[Learn more about using Mesh as Gateway](/docs/recipes/as-gateway)

### Consuming Mesh Schema in code

You can use the Mesh `GraphQLSchema` instance to query your data from your application code by using `getBuiltMesh` with your configuration object.

This will return for your modified version of GraphQL's `execute`, so you can use it directly to fetch your data:

```js
const { getBuiltMesh } = require('./.mesh');

async function test() {
  const { execute } = await getBuiltMesh();

  // Use `execute` to run a query directly and fetch data from your APIs
  const { data, errors } = await execute(/* GraphQL */ `
    query wikipediaMetrics {
      getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd(
        access: ALL_ACCESS
        agent: USER
        start: "20200101"
        end: "20200226"
        project: "en.wikipedia.org"
        granularity: MONTHLY
      ) {
        items {
          views
        }
      }
    }
  `);
}
```

### Introspecting your Mesh / Exporting your Schema

You can find dumped schema under `.mesh` folder as `schema.graphql`.

This is useful if you need to feed other tools (like [graphql-codegen](https://graphql-code-generator.com), [graphql-eslint](https://github.com/dotansimha/graphql-eslint), [graphql-inspector](https://graphql-inspector.com) and more) with the static GraphQL schema.

### Validate your existing Mesh artifacts

You can make sure your existing Mesh artifacts are still valid and safe to use in production. So when you run the following command, Mesh will validate the existing artifacts by introspecting the input sources again.

```sh
yarn mesh validate
```

### Generate an SDK from defined operations in order to use it in your existing app

[Learn how to use Mesh as SDK](/docs/recipes/as-sdk)
