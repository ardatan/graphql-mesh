---
id: basic-example
title: Basic Usage
sidebar_label: 3. Basic Usage
---

To get started with a simple Mesh, create a GraphQL Mesh configuration file - `.meshrc.yaml`, under your project root, and fill in your sources, for example:

```yml
sources:
  - name: Wiki
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml
```

This demo will use the public API of Wikipedia, which uses `openapi` spec, so we'll need to make sure we have `@graphql-mesh/openapi` handler installed as well:

```
yarn add graphql @graphql-mesh/openapi
```

### Try your new API

GraphQL Mesh comes with a built in GraphiQL interface, so it means that you can try your newly-created GraphQL before writing any line of code. All you need to get started is the configuration file.

To test your new GraphQL API based on your API specs, you can run:

```
yarn graphql-mesh serve
```

This will serve a GraphiQL interface with your schema, so you'll be able to test it right away, before intergrating it to your application, you can try to run a test query.

Open your browser in `http://localhost:4000` to start using it.

For example, this following will fetch all page views for Wikipedia.org on the past month:

```graphql
query wikipediaMetrics {
  getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd(
    access: ALL_ACCESS
    agent: USER
    start: "20200101"
    end: "20200226"
    project: "en.wikipedia.org"
    granularity: DAILY
  ) {
    items {
      views
    }
  }
}
```

You can give it a try and run it directly in your browser.

> You can find the complete example [here](https://github.com/Urigo/graphql-mesh/tree/master/examples/openapi-javascript-wiki)

### Consuming Mesh Schema in code

After you have tested your new API, you can use it directly in your app in order to fetch data.

You can use the Mesh `GraphQLSchema` instance to query your data from your application code by using `getMesh` with your configuration object.

Start by load and parsing your configuration file, and pass it to `getMesh`, this will return for your a modified version of GraphQL's `execute`, so you can use it directly to fetch your data:

You need to install `@graphql-mesh/runtime` and `@graphql-mesh/config` to access GraphQL Mesh Schema inside your code.

```
yarn add @graphql-mesh/runtime
```

```js
const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');

async function test() {
  // This will load the config file from the default location (process.cwd)
  const meshConfig = await findAndParseConfig();
  const { execute } = await getMesh(meshConfig);

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

Since GraphQL-Mesh schema is created during runtime (based on your external API sources), it's not possible to access it without serving it.

If you need to get the GraphQL schema SDL or GraphQL schema introspection, you can use the following command to generate a static file:

```
yarn graphql-mesh dump-schema --output ./schema.graphql
```

Or, for introspection JSON:

```
yarn graphql-mesh dump-schema --output ./schema.json
```

The `dump-schema` command uses an implicit switch based on the target file extension `.graphql` or `.json` to produce different output files. Make sure you select the correct one for your purposes. The `.graphql` extension causes the output to be in GraphQL SDL (Schema Definition Language) format.

This is useful if you need to feed other tools (like [graphql-codegen](https://graphql-code-generator.com/), [graphql-eslint](https://github.com/dotansimha/graphql-eslint), [graphql-inspector](https://graphql-inspector.com/) and more) with the static GraphQL schema.
