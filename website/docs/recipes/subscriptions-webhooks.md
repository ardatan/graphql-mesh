---
id: subscriptions-webhooks
title: Handle Webhooks with GraphQL Subscriptions
sidebar_label: Subscriptions & Webhooks
---

<img src="https://the-guild.dev/blog-assets/graphql-mesh-subscriptions/cover.png" width="300" style={{ margin: '0 auto' }} />

GraphQL Mesh can consume Webhooks as GraphQL Subscriptions in the unified schema by using built-in PubSub implementation

## Add new Subscription field

You can use `additionalTypeDefs` and `additionalResolvers` to add subscription root fields to your unified schema.

```yml
additionalTypeDefs: |
  # If you don't have Subscription type defined anywhere
  # You have to extend subscription definition
  extend schema {
    subscription: Subscription
  }
  type Subscription {
    todoAdded: Todo
  }
additionalResolvers:
  - targetTypeName: Subscription
    targetFieldName: todoAdded
    pubsubTopic: todoAdded
    # result: data.someProp.someOtherProp # You can get nested fields
    # filterBy: root.userId === args.userId # You can filter the payload by `userId` for example
```

We're able to use existing types from our unified schema, and this root field is subscribed to our specific `topic` in our PubSub service.

### Use JSON Schema Handler instead

You can also use JSON Schema handler if you don't want to write an extra GraphQL type definitions. You can generate GraphQL type definitions from sample JSON response;

Just add the following to your existing JSON schema handler configuration in `.meshrc.yml` file;
```yml
          - type: Subscription
            field: todoAdded
            pubsubTopic: todoAdded
            responseSample: ./todo.json
```

## Handle Webhook HTTP Requests

Add custom express handler to listen specific path for your HTTP Webhook on Mesh CLI Server. You can do it either in a programmatic or declarative way.

### Using Declarative API

Let's say you have running GraphQL Mesh server listening `4000` port, and you need to listen a specific route for upcoming HTTP requests as HTTP Webhook.

```yml
serve:
  port: 4000
  handlers:
    - path: /webhooks/todo_added
      pubsubTopic: todoAdded
      # payload: data # you can get `data` prop of the received data
```

`path` defines the path in our server that will receive HTTP requests as "Webhook" from our API then send it to `pubsubTopic`.

### Custom Handler in Code

`handler` can get any kind of Express request handler. So you can extend Mesh Server however you want.

```yml
serve:
  port: 4000
  handlers:
    - path: /webhooks/todo_added
      handler: ./todo_added.handler.js
```

and in `todo_added_handler.js` we have something like following;

```js
module.exports = (req, res) => {
    // Mesh PubSub instance is available under `req`
    req.pubsub.publish('todoAdded', req.body);
    res.end(); // Don't forget to finish the HTTP connection
};
```

> You can check out our example

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/json-schema-subscriptions?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="json-schema-subscriptions"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin" />
