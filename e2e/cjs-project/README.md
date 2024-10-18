# CommonJS example

This example demonstrate that Hive Gateway is working in a CJS environment and can be configured
using a plain CJS file.

It exposes a dummy `hello world` schema.

## Compose

The supergraph schema can be created using `mesh-compose` command:

```bash
$ yarn mesh-compose > supergraph.graphql
```

## Serve

The generated supergraph can then be served by the Hive Gateway:

```bash
$ yarn hive-gateway supergraph
```

<!-- prettier-ignore -->
> [!NOTE]
> This schema is not be actually executed, the actual implementation of the subgraph is not provided.

<!-- /prettier-ignore>
