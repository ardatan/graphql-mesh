---
id: subscriptions-webhooks
title: Handle Webhooks with GraphQL Subscriptions
sidebar_label: Subscriptions & Webhooks
---

GraphQL Mesh can consume Webhooks as GraphQL Subscriptions in the unified schema by using the built-in PubSub implementation

## Add a new Subscription field

You can use `additionalTypeDefs` and `additionalResolvers` to add subscription root fields to your unified schema.

```yaml
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

We can use existing types from our unified schema, and this root field is subscribed to our specific `topic` in our PubSub service.



<p>&nbsp;</p>


### Use JSON Schema Handler instead

You can also use the JSON Schema handler if you don't want to write an extra GraphQL type definition. You can generate GraphQL type definitions from sample JSON response;

Just add the following to your existing JSON schema handler configuration in `.meshrc.yml` file;
```yaml
          - type: Subscription
            field: todoAdded
            pubsubTopic: todoAdded
            responseSample: ./todo.json
```


<p>&nbsp;</p>

------

<p>&nbsp;</p>


## Handle Webhook HTTP Requests

Add a custom express handler to listen to a specific path for your HTTP Webhook on Mesh CLI Server. You can do it either in a programmatic or declarative way.


<p>&nbsp;</p>


### Using Declarative API

You have a running GraphQL Mesh server listening `4000` port, and you need to listen to a specific route for upcoming HTTP requests as HTTP Webhook.

```yaml
serve:
  port: 4000
  handlers:
    - path: /webhooks/todo_added
      pubsubTopic: todoAdded
      # payload: data # you can get `data` prop of the received data
```

`path` defines the path in our server that will receive HTTP requests as "Webhook" from our API and then send it to `pubsubTopic`.



<p>&nbsp;</p>


### Custom Handler in Code

`handler` can get any kind of Express request handler. So you can extend Mesh Server however you want.

```yaml
serve:
  port: 4000
  handlers:
    - path: /webhooks/todo_added
      handler: ./todo_added.handler.js
```

and in `todo_added_handler.js`, we have something like the following;

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
