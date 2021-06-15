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

## Try your new API

GraphQL Mesh comes with a built in GraphiQL interface, so it means that you can try your newly-created GraphQL before writing any line of code. All you need to get started is the configuration file.

To test your new GraphQL API based on your API specs, you can run:

```
yarn mesh dev
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
