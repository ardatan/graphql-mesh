---
id: custom-server
title: Custom Server
sidebar_label: Custom Server (Apollo etc.)
---

By default, GraphQL Mesh provides you an HTTP server. You can see the details in [Mesh as Gateway page](/docs/recipes/as-gateway). However, you can replace GraphQL Mesh's default server implementation by a custom one.

## How to do?

The following example shows how to replace GraphQL Mesh's default server implementation with [Apollo Server](https://apollographql.com/docs/apollo-server).

`myServerHandler.js`

```js
const { ApolloServer } = require('apollo-server');

module.exports = async ({ getBuiltMesh, documents, logger }) => {
  const { schema } = await getBuiltMesh();
  const apolloServer = new ApolloServer({
    schema,
    context: ({ req }) => req,
    playground: {
      tabs: documents.map(({ location, rawSDL }) => ({
        name: location,
        endpoint: '/graphql',
        query: rawSDL,
      })),
    },
  });

  const { url } = await apolloServer.listen(4000);
  logger.info(`🚀 Server ready at ${url}`);
};
```

Then add the following line to your configuration file.

```yml
serve:
  customServerHandler: ./myServerHandler.js
```

> When you use custom server handler, you won't be able to use configuration options under `serve`!

## Example

<iframe src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/openapi-location-weather?fontsize=14&hidenavigation=1&theme=dark"
    style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
    title="typescript-location-weather-example"
    allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts" />
