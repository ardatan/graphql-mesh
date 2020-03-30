---
id: cache
title: Cache Transform
sidebar_label: Cache
---

The `cache` transform allow you to apply caching over your data-sources easily. 

It allow you to configure custom invalidation rules (by ttl / mutation), and selective caching, according to your needs.

> This transform is being applied globally, because of the need to communicate with other GraphQL operations from your mesh.

To get started with this transform, install it from npm:

```
yarn add @graphql-mesh/transform-cache
```

> GraphQL Mesh uses a default in-memory LRU cache, but you can replace it with any other key=>value cache mechanism. See [custom cache section](/docs/recipes/custom-cache) for more info.

## How to use?

### Simple caching

To cache some of your queries, apply the following transform rule. This following example will cache all `Query.*` in your schema, forever:

```yml
transform:
  - cache:
      - field: Query.*
```

You can also apply it to a specific field, or multiple fields:

```yml
transform:
  - cache:
      - field: Query.users
  - cache:
      - field: Query.posts
```

### The Cache Key

Each cache record is being stored with a key. The default way of creating this key is to use the GraphQL type name, the GraphQL field name, and a hash of the `args` object. This is in order to make that we can distinct the cache key according to the data it's storing.

You can customize the `cacheKey` according to your needs, and you can use custom helpers to help you create those cache keys dynamically. 

The following example creates a `cacheKey` by an GraphQL query argument called `userId`, per day:

```yml
transform:
  - cache:
      - field: Query.user
        cacheKey: user-{args.id}-{yyyy-mm-dd | date}
```

## Cache Invalidation

### TTL

Invalidation by TTL is the simplest way to deal with your cache. You can specify any time (in seconds) to keep your cache. 

```yml
transform:
  - cache:
      - field: Query.*
        invalidate:
          ttl: 3600 # 1 hour
```

### Operation-based

GraphQL Mesh has a built-in operation-based caching solution.

You can cache data easily, and invalidate it only when it changes by a mutation.

For example, given the following schema:

```graphql
type Query {
  user(id: ID!): User!
}

type Mutation {
  updateUser(userIdToUpdate: ID!, setFields: UpdateUserInput!): User!
}

type User {
  id: ID!
  email: String!
  name: String
}

input UpdateUserInput {
  email: String
  name: String
}
```

You can set a simple caching, based on a user id: 

```yml
transform:
  - cache:
      - field: Query.user
        cacheKey: user-{args.id}
```

And you can add operation-based invalidation, so when `updateUser` is done successfully, it will invalidate the matching cache record to make sure the data will be fetched next time from the remote source:

```yml
transform:
  - cache:
      - field: Query.user
        cacheKey: user-{args.id}
        invalidates:
          effectingOperations:
            - operation: Mutation.updateUser
              matchKey: {args.userIdToUpdate}
```

This way, when someone uses `updateUser` with a specific user id, it will update the data record, and then invalidate the cache automatically.

### Programmatic 

The `getMesh` method of GraphQL Mesh returns the general key=>value cache it uses at the moment, so you can easily access it and invalidate records according to your needs:

```ts
const { schema, execute, cache } = getMesh(config);

cache.delete(SOME_KEY);
```

## Config API Reference

{@import ../generated-markdown/CacheTransformConfig.generated.md}
