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

> GraphQL Mesh uses a default in-memory LRU cache, but you can replace it with any other key=>value cache mechanism. See [cache section](/docs/cache/inmemory-lru) for more info.

## How to use?

### Simple caching

To cache some of your queries, apply the following transform rule. This following example will cache all `Query.*` in your schema, forever:

```yml
transforms:
  - cache:
      - field: Query.*
```

You can also apply it to a specific field, or multiple fields:

```yml
transforms:
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
transforms:
  - cache:
      - field: Query.user
        cacheKey: user-{args.id}-{yyyy-mm-dd | date}
```

## Cache Invalidation

### TTL

Invalidation by TTL is the simplest way to deal with your cache. You can specify any time (in seconds) to keep your cache. 

```yml
transforms:
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
transforms:
  - cache:
      - field: Query.user
        cacheKey: user-{args.id}
```

And you can add operation-based invalidation, so when `updateUser` is done successfully, it will invalidate the matching cache record to make sure the data will be fetched next time from the remote source:

```yml
transforms:
  - cache:
      - field: Query.user
        cacheKey: user-{args.id}
        invalidate:
          effectingOperations:
            - operation: Mutation.updateUser
              matchKey: user-{args.userIdToUpdate}
```

This way, when someone uses `updateUser` with a specific user id, it will update the data record, and then invalidate the cache automatically.

### Programmatic 

The `getMesh` method of GraphQL Mesh returns the general key=>value cache it uses at the moment, so you can easily access it and invalidate records according to your needs:

```ts
const { schema, execute, cache } = getMesh(config);

cache.delete(SOME_KEY);
```

## Codesandbox Example

You can check Location Weather example that uses OpenAPI handler with cache transform;

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/openapi-location-weather?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="typescript-location-weather-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"/>

## Config API Reference

{@import ../generated-markdown/CacheTransformConfig.generated.md}
