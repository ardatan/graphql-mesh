---
id: live-queries
title: Live Queries
sidebar_label: Live Queries
---

GraphQL Live Query implementation from [Laurin Quast](https://github.com/n1ru4l) can be used in GraphQL Mesh with a few additions in the configuration.

### Basic Usage

You have a `Query` root field that returns all `Todo` entities from your data source like below.

```graphql
query getTodos {
    todos {
        id
        content
    }
}
```

And you want to update this operation result automatically without manual refresh when `Mutation.addTodo` is called.

You only need to add the following to your existing configuration.

```yaml
additionalTypeDefs: |
    directive @live on QUERY
liveQueryInvalidations:
    - field: Mutation.addTodo
      invalidate:
        - Query.todos
```

Then you can send a live query with `@live` directive.

```graphql
query getTodos @live {
    todos {
        id
        content
    }
}
```

This will start a real-time connection between the server and your client. The response of `todos` will get updated whenever `addTodo` is called.


<p>&nbsp;</p>

------

<p>&nbsp;</p>


### ID Based Invalidation

Let's say you have the following query that returns a specific `Todo` entity based on `id` field;

```graphql
query getTodo($id: ID!) {
    todo(id: $id) {
        id
        content
    }
}
```

If you update this entity with `editTodo` mutation field on your backend, then you want to invalidate this entity specifically instead of validating all `todo` queries;

```yaml
liveQueryInvalidations:
    - field: Mutation.editTodo
      invalidate:
        - Todo:{args.id}
```

In a case where the field resolver resolves null but might resolve to an object type later, e.g., because the visibility got update the field that uses a specific id argument can be invalidated in the following way:

```yaml
liveQueryInvalidations:
    - field: Mutation.editTodo
      invalidate:
        - Query.todo(id:"{args.id}")
```


<p>&nbsp;</p>

------

<p>&nbsp;</p>


### Programmatic Usage

`liveQueryStore` is available in GraphQL Context, so you can access it in resolvers composition functions that wrap existing resolvers or additional resolvers;

See [Resolvers Composition](/docs/transforms/resolvers-composition)

```yaml
transforms:
    - resolversComposition:
        - resolver: Mutation.editTodo
          composer: invalidate-todo#invalidateTodo
```

And in this code file;

```js
module.exports = {
    invalidateTodo: next => async (root, args, context, info) => {
        const result = await next(root, args, context, info);
        context.liveQueryStore.invalidate(`Todo:${args.id}`);
        return result;
    }
}
```

> You can learn more about [GraphQL Live Query](https://github.com/n1ru4l/graphql-live-query) in its documentation.

> You can check out our example that uses live queries

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/json-schema-subscriptions?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="json-schema-subscriptions"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin" />
