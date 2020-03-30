---
id: mesh-transforms
title: Mesh Transforms
sidebar_label: Mesh Transforms
---

## Introduction to Transforms

GraphQL Mesh allow you to do schema transformations easily, you can use one of the built-in transforms, or write your own.

Each transformer can manipulate the schema the way it needs, and return the modified schema.

You can find a [list of available transforms here](/docs/transforms/available-transforms).

Transforms are specified as a list of objects, and they are executed in order, and you can apply them over a specific input source, or over the unified schema (after merging all sources).

## Handler-level transforms

To specify `transforms` over a specific source, add it to your `sources` section under the source you wish to modify.

The following example prefixes an input source to make it simpler later to merge and avoid conflicts:

```yml
sources:
  - name: Wiki
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml
    transforms:
      - prefix:
          value: Wiki_
```

## Root-level transforms

To specify `transforms` over unified schema, you should put it in the root of your config file. This could be used in case you need access fields or types from all your data source, for example for linking two data sources together.

The following example prefixes an input source to make it simpler later to merge and avoid conflicts:

```yml
sources:
  - name: Users
    handler: #...
  - name: Posts
    handler: #...
transforms:
  - extend: |
      extend type User {
        posts: [Posts!]!
      }

      extend type Post {
        author: User!
      }
```

## Usage Example

You can add custom resolvers and custom GraphQL schema SDL, and use the API SDK to fetch the data and manipulate it. So the query above could be simplified with custom logic.

This is possible because GraphQL Mesh will make sure to expose all available services in each API in your `context` object.

It's named the same as the API name, so to access the API of `Wiki` source, you can use `context.Wiki.api` and use the methods you need. It's useful when you need add custom behaviours, fields and types, and also for linking types between schemas.

In the following example, we will add take the query we has in the [previous example](/docs/getting-started/basic-example), and simplify it by adding a new root operation to `Query` type, and automate the variables that it needs, in order to create a simpler version of it for the consumers.

To add a new simple field, that just returns the amount of views for the past month, you can wrap it as following in your GraphQL config file, and add custom resolvers file using `additionalResolvers` field:

```yml
sources:
  - name: Wiki
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml
    transforms:
      - extend: |
          extend type Query {
            viewsInPastMonth(project: String!): Float!
          }
additionalResolvers:
  - ./src/mesh/additional-resolvers.js
```

> We are using a Mesh transformer called `extend` - you can use it to extend types and add custom SDL to your schema.

Now, we need to implement `src/mesh/additional-resolvers.js` with code that fetches and manipulate the data:

```js
const moment = require('moment');

const resolvers = {
  Query: {
    viewsInPastMonth: async (root, args, { Wiki }) => {
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

Now run `graphql-mesh serve` and you'll be able to see your new field as part of your GraphQL schema, and you'll be able to query for it.

And now we run the the following GraphQL query to fetch the simplified data:

```graphql
query viewsInPastMonth {
  viewsInPastMonth(project: "en.wikipedia.org")
}
```

> You can find the complete example [here](https://github.com/Urigo/graphql-mesh/tree/master/examples/javascript-wiki)
