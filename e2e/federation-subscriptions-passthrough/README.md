# Federation Subscriptions Passthrough

In this example, we demonstrate how to passthrough subscriptions from the client to the subgraphs,
using an Apollo Federation Supergraph schema composed with `rover`.

## Start subgraphs

This example is federating 2 subgraphs:

- products: A subgraph using WebSocket subscriptions. It exposes the `productPriceChanged` field.
- reviews: A subgraph using HTTP Callbacks subscriptions. It exposes the `countdown` field.

To start those services, you first need to install dependencies. In this example, we are using
`yarn` but you can use any package manager.

```bash
$ yarn
```

Both services have to be started in separated terminals (or using any parallelization/multiplexing
tool):

```bash
$ yarn start:products
$ yarn start:reviews
```

## Compose the Supergraph

To expose the supergraph with the Hive Gateway, we first need to compose the subgraphs schemas into
a single supergrph schema and store it into a file.

By default, the Hive Gateway will search for a `supergraph.graphql` file next to the configuration
file.

In this example, we are using official Apollo Federation composition tool: the `rover` CLI. Please
look at the `package.json` and `supergraph.yaml` or
[official documentation](https://www.apollographql.com/docs/rover/) for details

```bash
$ yarn compose
```

## Start the Hive Gateway

You can now start the gateway:

```bash
$ yarn start:gateway
```

You can now open
[the GraphiQL console](http://localhost:4000/graphql?query=subscription+%7B%0A++countdown%28from%3A10%29%0A%7D)
to try the subscriptions.

## More infos

See
[Subscriptions documentation page](https://the-guild.dev/graphql/hive/docs/gateway/subscriptions)
for more details.
