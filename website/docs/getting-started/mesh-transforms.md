---
id: mesh-transforms
title: Mesh Transforms
sidebar_label: 4. Mesh Transforms
---

## Introduction to Transforms

GraphQL Mesh allow you to do schema transformations easily, you can use one of the built-in transforms, or write your own.

Each transformer can manipulate the schema the way it needs, and return the modified schema.

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
  - cache:
      - field: Query.user
        cacheKey: user-{args.id}
        invalidates:
          effectingOperations:
            - operation: Mutation.updateUser
              matchKey: {args.userIdToUpdate}
```

The example above uses `cache` transform on root and when someone uses `updateUser` with a specific user id, it will update the data record, and then invalidate the cache automatically.

You can learn more about caching [in the dedicated docs.](/docs/transforms/cache)
