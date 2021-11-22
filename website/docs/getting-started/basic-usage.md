---
id: basic-example
title: Basic Usage
sidebar_label: Basic Usage
---

To get started with a simple Mesh, create a GraphQL Mesh configuration file `.meshrc.yaml`, under your project root, and fill in your sources, for example:

```yml
sources:
  - name: StackExchange
    handler:
      openapi:
        source: https://raw.githubusercontent.com/grokify/api-specs/master/stackexchange/stackexchange-api-v2.2_openapi-v3.0.yaml
```

This demo will use the public API of StackExchange, which uses `openapi` spec, so we'll need to make sure we have `@graphql-mesh/openapi` handler installed as well:

```sh
yarn add graphql @graphql-mesh/openapi
```

[Learn more about OpenAPI Handler](https://graphql-mesh.com/docs/handlers/openapi)

## Try your new API

GraphQL Mesh comes with a built-in GraphiQL interface, so it means that you can try your newly-created GraphQL before writing any line of code. All you need to get started is the configuration file.

To test your new GraphQL API based on your API specs, you can run:

```sh
yarn mesh dev
```

This will serve a GraphiQL interface with your schema, so you'll be able to test it right away, before integrating it to your application, you can try to run a test query.

Open your browser in `http://localhost:4000` to start using it.

For example, this following will fetch all page views for Wikipedia.org on the past month:

```graphql
query ListQuestions {
  listQuestions(site: "stackoverflow") {
    items {
      title
      tags
      isAnswered
      answerCount
      link
    }
  }
}
```

You can give it a try and run it directly in your browser.

> You can find the complete example [here](https://codesandbox.io/s/github/Urigo/graphql-mesh/tree/master/examples/openapi-stackexchange)

## What's next?

Checkout `Recipes` section to learn more about GraphQL Mesh!
