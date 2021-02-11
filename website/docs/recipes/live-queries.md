---
id: live-queries
title: Live Queries
sidebar_label: Live Queries
---

[Laurin Quast](https://github.com/n1ru4l)'s GraphQL Live Query implementation can be used in GraphQL Mesh with a few addition in the configuration.

Let's say you have a `Query` root field that returns all `Todo` entities from your data source like below;

```graphql
query getTodos {
    todos {
        id
        content
    }
}
```

And you want to update this operation result automatically without manual refresh when `Mutation.addTodo` is called.

The only thing you need is to add the following configuration to your existing configuration;

```yml
liveQueryInvalidations:
    - field: Mutation.addTodo
      invalidate: 
        - Query.todos
```

Then you can send a live query with `@live` directive;

```graphql
query getTodos @live {
    todos {
        id
        content
    }
}
```

This will start a real-time connection between server and your client, then the response of `todos` will get updated whenever `addTodo` is called.

### ID Based Invalidation

Let's say you have the following query that returns specific `Todo` entity based on `id` field;

```graphql
query getTodo($id: ID!) {
    todo(id: $id) {]
        id
        content
    }
}
```

And you update this entity with `editTodo` mutation field on your backend then you want to invalidate this entity specifically instead of validating all `todo` queries;

```yml
liveQueryInvalidations:
    - field: Mutation.editTodo
      invalidate: 
        - Todo:{args.id}
```

### Programmatic Usage

`liveQueryStore` is available in GraphQL Context so you can access it in resolvers composition functions that wrap existing resolvers or additional resolvers;

See [Resolvers Composition](/docs/transforms/resolvers-composition)

```yml
transforms:
    - resolversComposition:
        - resolver: Mutation.editTodo
          composer: invalidate-todo#invalidateTodo
```

And in this code file;

```js
module.exports = {
    invalidateTodo: next => (root, args, context, info) => {
        const result = await next(root, args, context, info);
        context.liveQueryStore.invalidate(`Todo:${args.id}`);
        return result;
    }
}
```

> You can learn more about [GraphQL Live Query](https://github.com/n1ru4l/graphql-live-query) in its documentation.