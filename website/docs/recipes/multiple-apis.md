---
id: multiple-apis
title: Combine and extend different sources
sidebar_label: Combine and extend sources
---

GraphQL Mesh is able to merge different data sources into a single unified GraphQL Schema, and GraphQL Mesh is not an alternative to Schema Stitching, Apollo Federation, Bare Schema Merging or another merging strategy. GraphQL Mesh can consume and merge your data sources in different approaches.

In addition to `@apollo/gateway`, GraphQL Mesh supports subscriptions out-of-box.

[Learn more the key differences between Schema Stitching and Apollo Federation](https://product.voxmedia.com/2020/11/2/21494865/to-federate-or-stitch-a-graphql-gateway-revisited)

## Extending GraphQL Schema with `additionalTypeDefs`

You can add new types and/or fields to the current unified GraphQL Schema by using `additionalTypeDefs` configuration field;

Let's say we have `Wikipedia` API in our Mesh configuration;

```yml
sources:
  - name: StackExchange
    handler:
      openapi:
        source: https://raw.githubusercontent.com/grokify/api-specs/master/stackexchange/stackexchange-api-v2.2_openapi-v3.0.yaml

additionalTypeDefs: |
    extend type Query {
      listQuestionsFromStackOverflow(first: Int!): [Question]
    }
```

And here we add a new field under `Query` root type named `viewsInPastMonth`. But we need a resolver for this new field.

## Declare a resolver to the new `additionalTypeDefs` by using `additionalResolvers`

We have `additionalResolvers` field to make our new field executable in the unified schema;

```yml
sources:
  - name: StackExchange
    handler:
      openapi:
        source: https://raw.githubusercontent.com/grokify/api-specs/master/stackexchange/stackexchange-api-v2.2_openapi-v3.0.yaml

additionalTypeDefs: |
      extend type Query {
        listQuestionsFromStackOverflow(first: Int!): [Question]
      }
additionalResolvers:
  - targetTypeName: Query
    targetFieldName: listQuestionsFromStackOverflow
    sourceName: StackExchange # Which source does the target field belong to?
    sourceTypeName: Query # Which root type does the target field belong to?
    sourceFieldName: listQuestions # What is the source field name?
    sourceArgs: # What args does this need to take?
      pagesize: "{args.first}"
    result: items # We want to extract `items` from the result and return only this one
```

## Add `additionalResolvers` programmatically from a code source

You can add custom resolvers and custom GraphQL schema SDL, and use the API SDK to fetch the data and manipulate it. So the query above could be simplified with custom logic.

This is possible because GraphQL Mesh will make sure to expose all available services in each API in your `context` object.

It's named the same as the API name, so to access the API of `Wiki` source, you can use `context.Wiki.Query` and use the methods you need. It's useful when you need add custom behaviours, fields and types, and also for linking types between schemas.

In the following example, we will add take the query we had in the [previous example](/docs/getting-started/basic-example), and simplify it by adding a new root operation to `Query` type, and automate the variables that it needs, in order to create a simpler version of it for the consumers.

To add a new simple field, that just returns the amount of views for the past month, you can wrap it as following in your GraphQL config file, and add custom resolvers file using `additionalResolvers` field:

```yml
sources:
  - name: Wiki
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml
additionalTypeDefs: |
  extend type Query {
    viewsInPastMonth(project: String!): Float!
  }
additionalResolvers:
  - ./src/mesh/additional-resolvers.js
```

Now, we need to implement `src/mesh/additional-resolvers.js` with code that fetches and manipulate the data:

```js
const moment = require('moment');


const resolvers = {
  Query: {
    viewsInPastMonth: async (root, args, context, info) => {
      const { items } = await context.Wiki.Query.getMetricsPageviewsAggregateProjectAccessAgentGranularityStartEnd({
        root,
        args: {
          access: 'all-access',
          agent: 'user',
          end: moment().format('YYYYMMDD'),
          start: moment().startOf('month').subtract(1, 'month').format('YYYYMMDD'),
          project: args.project,
          granularity: 'monthly',
        },
        context,
        info,
        selectionSet: /* GraphQL */`
          {
            views
          }
        `
      });

      if (!items || items.length === 0) {
        return 0;
      }

      return items[0].views;
    },
  },
};

module.exports = { resolvers };
```

Now run `mesh dev` and you'll be able to see your new field as part of your GraphQL schema, and you'll be able to query for it.

And now we run the following GraphQL query to fetch the simplified data:

```graphql
query viewsInPastMonth {
  viewsInPastMonth(project: "en.wikipedia.org")
}
```

> You can find the complete example [here](https://github.com/Urigo/graphql-mesh/tree/master/examples/openapi-javascript-wiki)

> You can use TypeScript to have full type-safety in additional resolvers. See [TypeScript Support](/docs/recipes/typescript) section to learn more.

## Combining Schemas using declarative API or JavaScript Code File

We learnt that we can combine multiple APIs in Mesh using `additionalTypeDefs` and `additionalResolvers`.

The following example has two different OpenAPI sources; we add two new fields to a type of `Cities`, and those fields have return types from `Weather` API.

But this time we don't use an extra resolvers file for `additionalResolvers` but only the configuration file.

```yaml
sources:
  - name: Cities
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/mashape.com/geodb/1.0.0/swagger.json
        operationHeaders:
          'X-RapidAPI-Key': f93d3b393dmsh13fea7cb6981b2ep1dba0ajsn654ffeb48c26
  - name: Weather
    handler:
      openapi:
        source: https://api.apis.guru/v2/specs/weatherbit.io/2.0.0/swagger.json
additionalTypeDefs: |
  extend type PopulatedPlaceSummary {
    dailyForecast: [Forecast]
    todayForecast: Forecast
  }
additionalResolvers:
  - targetTypeName: PopulatedPlaceSummary
    targetFieldName: dailyForecast
    requiredSelectionSet:
      | # latitude and longitude will be request if dailyForecast is requested on PopulatedPlaceSummary level
      {
        latitude
        longitude
      }
    sourceName: Weather # Target Source Name
    sourceTypeName: Query # Target Root Type
    sourceFieldName: getForecastDailyLatLatLonLon # Target root field of that source
    sourceArgs:
      lat: '{root.latitude}' # Access required fields and pass those to args of getForecastDailyLatLatLonLon
      lon: '{root.longitude}'
      key: "{context.headers['x-weather-api-key']}" # x-weather-api-key coming from HTTP Headers
    result: data # Return `data` property of returned data
  - type: PopulatedPlaceSummary
    field: todayForecast
    requiredSelectionSet: |
      {
        latitude
        longitude
      }
    sourceName: Weather
    sourceTypeName: Query
    sourceFieldName: getForecastDailyLatLatLonLon
    sourceArgs:
      lat: '{root.latitude}'
      lon: '{root.longitude}'
      key: "{context.headers['x-weather-api-key']}"
    result: data[0] # You can even go deeper to extract an element of an array of a property of a returned data :)
    # returnType: ForecastDailyLatLatLonLon # This is needed if the actual return type doesn't match with the one defined in `additionalTypeDefs`
```

The declaration above equals to the following;

```js
const { print } = require('graphql');

module.exports = {
  PopulatedPlaceSummary: {
    dailyForecast: {
      selectionSet: /* GraphQL */`
        {
          latitude
          longitude
        }
      `,
      resolve: async (root, args, context, info) => {
        const result = await context.Weather.Query.getForecastDailyLatLatLonLon({
          root,
          args: {
            lat: root.latitude,
            lon: root.longitude,
            key: context.headers['x-weather-api-key'],
          },
          context,
          info,
          selectionSet: subtree => /* GraphQL */`
            {
              data {
                ${print(subtree)}
              }
            }
          `
        });
        return result?.data;
      },
    },
    todayForecast: {
      selectionSet: `
        {
          latitude
          longitude
        }
      `,
      async resolve(root, args, context, info) {
        const result = await context.Weather.Query.getForecastDailyLatLatLonLon({
          root,
          args: {
            lat: root.latitude,
            lon: root.longitude,
            key: context.headers['x-weather-api-key'],
          },
          context,
          info,
          selectionSet: subtree => /* GraphQL */`
            {
              data {
                ${print(subtree)}
              }
            }
          `
        });
        return result?.data?.[0];
      },
    },
  },
};
```

> Also, checkout [Postgres GeoDB example](https://github.com/Urigo/graphql-mesh/tree/master/examples/postgres-geodb) example that combines GitHub API and a Postgres DB sources.

## Merging types from different sources (using Type Merging)

Let's say you have two different services; `Books` and `Authors`. And those two are exposing the following schemas at the end;

```graphql
# Authors
type Query {
  authors(ids: [ID!]): [Author!]!
  author(id: ID!): Author!
}

type Author {
  id: ID!
  name: String!
}
```

```graphql
# Books
type Query {
  books(ids: [ID!]): [Book!]!
  book(id: ID!): Book!
  authorWithBooks(id: ID!): Author!
  authorsWithBooks(ids: [ID!]): [Author!]!
}

type Book {
  id: ID!
  title: String!
  authorId: ID!
}

type AuthorWithBooks {
  id: ID!
  books: [Book!]!
}
```

And you renamed `AuthorWithBooks` to `Author` using [`Rename`](/docs/transforms/rename) transform.
```yml
- sources:
  - name: BookService
    handler:
      # ...
    transforms:
      # Rename type names and field names to let stitching merger merges them
      - rename:
          renames:
            - from:
                type: AuthorWithBooks
              to:
                type: Author
            - from:
                type: Query
                field: authorWithBooks
              to:
                type: Query
                field: author
```

 then you expect following query works fine;

```graphql
{
  author(id: 0) {
    id # This field is common
    name # This field is from `AuthorService`
    books { # This field is from `BookService`
      id
      title
    }
  }
}
```

But it won't work because Mesh doesn't know which field belongs to where and how to combing those. For sure, you could add `additionalResolvers` then extract `books` from `AuthorWithBooks` then return it as `books` field of `Author` type but this sounds a little bit overhead. So let's try Type Merging here;

We have Type Merging transform to teach Mesh how to fetch entities from different sources;

```yml
sources:
  - name: AuthorService
    handler:
      # ...
    transforms:
      - typeMerging:
          queryFields:
            # No need to define which type it belongs
            # And no need to define a key for type
            # keyField assigns to that type automatically
            - queryFieldName: author
              keyField: id
            # keyArg: id <-- This is needed if you have multiple args
            #                for that query field
  - name: BookService
    handler:
      # ...
    transforms:
      # Rename type names and field names to let stitching merger merges them
      - rename:
          renames:
            - from:
                type: AuthorWithBooks
              to:
                type: Author
            - from:
                type: Query
                field: authorWithBooks
              to:
                type: Query
                field: author
            - from:
                type: Query
                field: authorsWithBooks
              to:
                type: Query
                field: authors
      - typeMerging:
          queryFields:
            # This doesn't use batching
            # It does regular stitching
            - queryFieldName: book
              keyField: id
            - queryFieldName: author
              keyField: id
```

Then now our query will work as expected!

[Check this out learn more about Type Merging transform](/docs/transforms/type-merging).

## Batching requests between sources to prevent N+1 problem

### In type merging

The example above works fine but there is an N+1 problem. It sends `n` requests for `n` entities. But we have `authors` and `books`. Type Merging is smart enough to handle batching if you point it to a field that returns a list of entities. Let's update our configuration for this;

```yml
sources:
  - name: AuthorService
    handler:
      # ...
    transforms:
      - typeMerging:
          queryFields:
            # No need to define which type it belongs
            # And no need to define a key for type
            # keyField assigns to that type automatically
            - queryFieldName: authors
            # Mesh automatically does batching if return type is a list
              keyField: id
            # keyArg: ids <-- This is needed if you have multiple args
            #                for that query field
  - name: BookService
    handler:
      # ...
    transforms:
      # Rename type names and field names to let stitching merger merges them
      - rename:
          renames:
            - from:
                type: AuthorWithBooks
              to:
                type: Author
            - from:
                type: Query
                field: authorWithBooks
              to:
                type: Query
                field: author
            - from:
                type: Query
                field: authorsWithBooks
              to:
                type: Query
                field: authors
      - typeMerging:
          queryFields:
            - queryFieldName: books
              keyField: id
            - queryFieldName: authors
              keyField: id
```

And now it batches the requests to the inner sources.

### In regular `additionalResolvers`

In the current example, we want to have a field called `author` under `Book` property then point it to `author`.

Normally we supposed to do the following definitions;
```yml
additionalTypeDefs: |
  extend type Book {
    author: Author
  }

additionalResolvers:
  - sourceName: AuthorService
    sourceTypeName: Query
    sourceFieldName: author
    sourceArgs:
      id: "{root.authorId}"
    targetTypeName: Book
    targetFieldName: author
    requiredSelectionSet: |
    {
      authorId
    }
```

But we want to solve N+1 problem;

```yml
additionalResolvers:
  # Create a stitching resolver with batching
  # to solve N+1 problem
  - sourceName: AuthorService
    sourceTypeName: Query
    sourceFieldName: authors
    keyField: authorId
    keysArg: ids
    targetTypeName: Book
    targetFieldName: author
```

And that's it. Now GraphQL Mesh will batch the queries of `Book.author` by using `authorId` field into `Query.authors`.

## Consuming Apollo Federation Services inside GraphQL Mesh

GraphQL Mesh uses [the approach of Schema Stitching](https://github.com/gmac/schema-stitching-handbook/tree/master/federation-services) in order to consume the existing Apollo Federation services inside GraphQL Mesh. So you can combine Federation and Type Merging in GraphQL Mesh

<img src="https://storage.googleapis.com/xebia-blog/1/2019/10/apollo-federation.jpg" width="300" alt="Apollo Federation" style={{ margin: '0 auto' }} />

You can follow Apollo Federation spec and integrate your existing Federated services into GraphQL Mesh.

GraphQL Mesh is smart enough to mix and match Federation and Stitching approaches including all other transforms (Type Merging, Rename, Filter etc.)

You can also transform your existing non-federated schemas into federated service.

```yml
sources:
  - name: accounts # Add a non-federated GraphQL Source
    handler:
      graphql:
        endpoint: http://localhost:4001/graphql
    transforms: # Transform it to a federated schema
      - federation:
          types:
            - name: Query
              config:
                extend: true
            - name: User
              config:
                keyFields:
                  - id
                resolveReference:
                  queryFieldName: user # Target root field

  - name: reviews # You can also use a federated schema
    handler:
      graphql:
        endpoint: http://localhost:4002/graphql
  - name: products
    handler:
      graphql:
        endpoint: http://localhost:4003/graphql
  - name: inventory
    handler:
      graphql:
        endpoint: http://localhost:4004/graphql
```

> You can [check out documentation of federation transformer](/docs/transforms/federation) to learn more about adding federation metadata to a non-federated GraphQL Schema.
