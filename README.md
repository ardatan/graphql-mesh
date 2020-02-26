## GraphQL Mesh

### Note: this project is experimental, and still being developed.

GraphQL Mesh allows you to use GraphQL query language to access data in remote APIs that don't run GraphQL (and also ones that do run GraphQL).
It can be used as a gateway to other services, or run as a local GraphQL schema that aggregates data from remote APIs.

The goal of GraphQL Mesh is to let developers easily access services that are written in other APIs specs (such as gRPC, OpenAPI, Swagger, oData, SOAP, and also GraphQL) with GraphQL queries and mutations.

GraphQL Mesh gives the developer the ability to modify the output schemas, link types across schemas and merge schema types. You can even add custom GraphQL types and resolvers that fit your needs.

It allows developers to control the way they fetch data, and overcome issues related to backend implementation, legacy API services, chosen schema specification and non-typed APIs.

The way GraphQL Mesh works is:

1. Collect API schema specifications from services
2. Create a runtime instance of fully-typed SDK for the services.
3. Convert API specs to GraphQL schema
4. Applies custom schema transformations and schema extensions
5. Creates fully-typed, single schema, GraphQL SDK to fetch data from your services.

GraphQL Mesh is acting as a proxy to your data, and uses common libraries to wrap your existing API services. You can use this proxy locally in your service or application by running the GraphQL schema locally (with GraphQL `execute`), or you can deploy this as a gateway layer to your internal service.

> Note: GraphQL Mesh doesn’t aim to magically create your utopic public GraphQL schema - it’s just an easy-to-use proxy to your data, and you should consider implementing another layer that exposes your public data the way you need it to be.

## Getting Started

### Installation

GraphQL Mesh comes in multiple packages, which you should install according to your needs.

To get started with the basics, install the following:

```
$ yarn add graphql @graphql-mesh/runtime @graphql-mesh/cli
```

### Getting Started

Now, create the initial GraphQL Mesh configuration file - `.meshrc.yaml`, under your project root, and fill in your sources, for example:

```yaml
sources:
  - name: Wiki
    source: https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml
    handler:
      name: openapi
```

> Note: If you wish to have auto-complete and documentation in the YAML config file, create `.vscode/settings.json` in your project, with the following content: `{ "yaml.schemas": { "./node_modules/@graphql-mesh/types/dist/config-schema.json": ".meshrc.yaml" }}`

Now, to test your new GraphQL API based on your API specs, you can run:

```
$ yarn graphql-mesh serve
```

This will server a GraphiQL interface with your schema, so you'll be able to test it right away, before intergrating it to your application, you can try to run a test query.

This following will fetch all page views for Wikipedia.org on the past month:

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

Now that you know that your Mesh works, you can use it directly within your application:

```js
const { getMesh, parseConfig } = require('@graphql-mesh/runtime');
const { ApolloServer } = require('apollo-server');

async function test() {
  // This will load the config file from the default location (process.cwd)
  const meshConfig = await parseConfig();
  const { execute, schema, contextBuilder } = await getMesh(meshConfig);

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

  // Or, if you wish to make this schema publicly available, expose it using any GraphQL server with the correct context, for example:
  const server = new ApolloServer({
    schema,
    context: contextBuilder
  });
}
```

### Schema Transformations

You can also add custom resolvers and custom GraphQL schema SDL, and use the API SDK to fetch the data and manipulate it. So the query above could be simplified with custom logic.

To add a new field, that just returns the amount of views for the past month, you can wrap it as following in your GraphQL config file, and add custom resolvers file:

```yaml
sources:
  - name: Wiki
    source: https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml
    handler:
      name: openapi
transformations:
  - type: extend
    sdl: |
      extend type Query {
        viewsInPastMonth(project: String!): Float!
      }
additionalResolvers:
  - ./src/mesh/additional-resolvers.js
```

And implement `src/mesh/additional-resolvers.js` with code that fetches and manipulate the data:

```js
const moment = require('moment');

const resolvers = {
  Query: {
    async viewsInPastMonth(root, args, { Wiki }) {
      const { items } = await Wiki.api.getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd(
        {
          access: 'all-access',
          agent: 'user',
          end: moment().format('YYYYMMDD'),
          start: moment().startOf('month').subtract(1, 'month').format('YYYYMMDD'),
          project: args.project,
          granularity: 'monthly'
        }
      );

      if (!items || items.length === 0) {
        return 0;
      }

      return items[0].views;
    }
  }
};

module.exports = { resolvers };
```

### Linking Schemas

TODO


### Supported APIs

The following APIs are supported/planned at the moment. You can easily add custom handlers to load and extend the schema.

| Package                      | Status    | Supported Spec                             |
| ---------------------------- | --------- | ------------------------------------------ |
| `@graphql-mesh/openapi`      | Available | Swagger, OpenAPI 2/3                       |
| `@graphql-mesh/graphql`      | TODO      | GraphQL endpoint (schema-stitching)        |
| `@graphql-mesh/json-schema`  | TODO      | JSON schema structure for request/response |
| `@graphql-mesh/postgraphile` | TODO      | Postgres database schema                   |
| `@graphql-mesh/odata`        | TODO      | OData specification                        |
| `@graphql-mesh/grpc`         | TODO      | gRPC and protobuf schemas                  |

### TypeScript

GraphQL Mesh allow API handler packages to provide TypeScript typings in order to have types support in your code.

In order to use the TypeScript support, use the CLI to generate typings file based on your unified GraphQL schema:

```

graphql-mesh typescript --output ./src/**generated**/mesh.ts

```

## Packages in this repo

TODO

## Write your own transformations and handlers

TODO
```
