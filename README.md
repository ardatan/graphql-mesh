## GraphQL Mesh

![CI](https://github.com/Urigo/graphql-mesh/workflows/CI/badge.svg)

### Note: this project is early and there will be breaking changes along the way

GraphQL Mesh allows you to use GraphQL query language to access data in remote APIs that don't run GraphQL (and also ones that do run GraphQL).
It can be used as a gateway to other services, or run as a local GraphQL schema that aggregates data from remote APIs.

The goal of GraphQL Mesh is to let developers easily access services that are written in other APIs specs (such as gRPC, OpenAPI, Swagger, oData, SOAP, and also GraphQL) with GraphQL queries and mutations.

GraphQL Mesh gives the developer the ability to modify the output schemas, link types across schemas and merge schema types. You can even add custom GraphQL types and resolvers that fit your needs.

It allows developers to control the way they fetch data, and overcome issues related to backend implementation, legacy API services, chosen schema specification and non-typed APIs.

GraphQL Mesh is acting as a proxy to your data, and uses common libraries to wrap your existing API services. You can use this proxy locally in your service or application by running the GraphQL schema locally (with GraphQL `execute`), or you can deploy this as a gateway layer to your internal service.

> Note: GraphQL Mesh doesn’t aim to magically create your utopic public GraphQL schema - it’s just an easy-to-use proxy to your data, and you should consider implementing another layer that exposes your public data the way you need it to be.

## Getting Started

<details>
<summary><strong>Installation</strong></summary>
<p>

GraphQL Mesh comes in multiple packages, which you should install according to your needs.

To get started with the basics, install the following:

```
$ yarn add graphql @graphql-mesh/runtime @graphql-mesh/cli
```

</p>
</details>

<details>
<summary><strong>Basic Usage</strong></summary>
<p>

Now, create the initial GraphQL Mesh configuration file - `.meshrc.yaml`, under your project root, and fill in your sources, for example:

```yaml
sources:
  - name: Wiki
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml
```

> Note: If you wish to have auto-complete and documentation in the YAML config file, create `.vscode/settings.json` in your project, with the following content: `{ "yaml.schemas": { "./node_modules/@graphql-mesh/types/dist/config-schema.json": ".meshrc.yaml" }}`

Now, to test your new GraphQL API based on your API specs, you can run:

```
$ yarn graphql-mesh serve
```

This will serve a GraphiQL interface with your schema, so you'll be able to test it right away, before intergrating it to your application, you can try to run a test query.

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

</p>
</details>

<details>
<summary><strong>Schema Transformations</strong></summary>
<p>

You can add custom resolvers and custom GraphQL schema SDL, and use the API SDK to fetch the data and manipulate it. So the query above could be simplified with custom logic.

This is possible because GraphQL Mesh will make sure to expose all available services in each API in your `context` object. It's named the same as the API name, so to access the API of `Wiki` source, we can do `context.Wiki.api` and use the methods we need. It's useful when you need add custom behaviours, fields and types, and also for linking types between schemas.

To add a new simple field, that just returns the amount of views for the past month, you can wrap it as following in your GraphQL config file, and add custom resolvers file:

```yaml
sources:
  - name: Wiki
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml
transforms:
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
      const {
        items
      } = await Wiki.api.getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd(
        {
          access: 'all-access',
          agent: 'user',
          end: moment().format('YYYYMMDD'),
          start: moment()
            .startOf('month')
            .subtract(1, 'month')
            .format('YYYYMMDD'),
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

Now running `graphql-mesh serve` will show you this field, and you'll be able to query for it.

And the code that fetches the data could now just do:

```graphql
query viewsInPastMonth {
  viewsInPastMonth(project: "en.wikipedia.org")
}
```

> You can find the complete example under `./examples/javascript-wiki` in this repo.

</p>
</details>

<details>
<summary><strong>Linking Schemas</strong></summary>
<p>
TODO
</p>
</details>

<details>
<summary><strong>Supported APIs</strong></summary>
<p>

The following APIs are supported/planned at the moment. You can easily add custom handlers to load and extend the schema.

| Package                      | Status    | Supported Spec                                                     |
| ---------------------------- | --------- | ------------------------------------------------------------------ |
| `@graphql-mesh/graphql`      | Available | GraphQL endpoint (schema-stitching, based on `graphql-tools-fork`) |
| `@graphql-mesh/federation`   | WIP       | Apollo Federation services                                         |
| `@graphql-mesh/openapi`      | Available | Swagger, OpenAPI 2/3 (based on `openapi-to-graphql`)               |
| `@graphql-mesh/json-schema`  | Available | JSON schema structure for request/response                         |
| `@graphql-mesh/postgraphile` | Available | Postgres database schema                                           |
| `@graphql-mesh/grpc`         | Available | gRPC and protobuf schemas                                          |
| `@graphql-mesh/soap`         | Available | SOAP specification                                                 |
| `@graphql-mesh/mongoose`     | Available | Mongoose schema wrapper based on `graphql-compose-mongoose`        |
| `@graphql-mesh/odata`        | WIP       | OData specification                                                |

</p>
</details>

<details>
<summary><strong>TypeScript Support</strong></summary>
<p>

### Type safety for custom resolvers

GraphQL Mesh allow API handler packages to provide TypeScript typings in order to have types support in your code.

In order to use the TypeScript support, use the CLI to generate typings file based on your unified GraphQL schema:

```
graphql-mesh typescript --output ./src/generated/mesh.ts
```

Now, you can import `Resolvers` interface from the generated file, and use it as the type for your custom resolvers. It will make sure that your parent value, arguments, context type and return value are fully compatible with the implementation. It will also provide fully typed SDK from the context:

```ts
import { Resolvers } from './generated/mesh';

export const resolvers: Resolvers = {
  // Your custom resolvers here
};
```

### Type safety for fetched data

Instead of using GraphQL operations as string with `execute` - you can use GraphQL Mesh and generate a ready-to-use TypeScript SDK to fetch your data. It will make sure to have type-safety and auto-complete for variables and returned data.

To generate this SDK, start by creating your GraphQL operations in a `.graphql` file, for example:

```graphql
query myQuery($someVar: String!) {
  getSomething(var: $someVar) {
    fieldA
    fieldB
  }
}
```

Now, use GraphQL Mesh CLI and point it to the list of your `.graphql` files, and specify the output path for the TypeScript SDK:

```
graphql-mesh generate-sdk --operations "./src/**/*.graphql" --output ./src/generated/sdk.ts
```

Now, instead of using `execute` manually, you can use the generated `getSdk` method with your a GraphQL Mesh client, and use the functions that are generated based on your operations:

```ts
import { getSdk } from './generated/sdk';
import { getMesh, parseConfig } from '@graphql-mesh/runtime';
import { ApolloServer } from 'apollo-server';

async function test() {
  // Load mesh config and get the sdkClient from it
  const meshConfig = await parseConfig();
  const { sdkRequester } = await getMesh(meshConfig);
  // Get fully-typed SDK using the Mesh client and based on your GraphQL operations
  const sdk = getSdk(sdkRequester);

  // Execute `myQuery` and get a type-safe result
  // Variables and result are typed: { data?: { getSomething: { fieldA: string, fieldB: number }, errors?: GraphQLError[] } }
  const { data, errors } = await sdk.myQuery({ someVar: 'foo' });
}
```

> You can find an example for that [here](https://github.com/Urigo/graphql-mesh/tree/master/examples/postgres-geodb#using-the-generated-sdk)

</p>
</details>

## How it works?

The way GraphQL Mesh works is:

1. Collect API schema specifications from services
2. Create a runtime instance of fully-typed SDK for the services.
3. Convert API specs to GraphQL schema
4. Applies custom schema transformations and schema extensions
5. Creates fully-typed, single schema, GraphQL SDK to fetch data from your services.
