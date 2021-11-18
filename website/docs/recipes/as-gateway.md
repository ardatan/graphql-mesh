---
id: as-gateway
title: Mesh as Gateway
sidebar_label: Mesh as Gateway
---

<img src="/static/img/as-gateway.png" width="450" alt="Apollo Federation" style={{ margin: '0 auto' }} />

You can use GraphQL Mesh as an HTTP gateway proxy for your data sources. GraphQL Mesh provides you an HTTP server with [Express](https://expressjs.com), [GraphQL Helix](https://github.com/contrawork/graphql-helix), [GraphQL-WS](https://github.com/enisdenjo/graphql-ws#readme) and [GraphiQL Explorer](https://github.com/OneGraph/graphiql-explorer) with a bunch of configurable features out-of-box.

There are two commands for GraphQL Mesh's HTTP Server;

- `dev` commands generates the unified schema without using any existing artifacts on the disk, and it introspects all the schemas, but it doesn't save it.
- `start` commands generates the unified schema by using the existing artifacts previously created by `mesh build` command. [Learn more about Mesh artifacts.](/docs/recipes/build-mesh-artifacts).

You can also point to a specific directory which contains the source files (`.meshrc.yaml`, etc.)

```sh
mesh dev --dir some/path/to-configuration/
```

GraphQL Mesh's HTTP Server can be configured by setting the `serve` object in `.meshrc.yaml` like below:

```yaml
serve:
    port: 5000
    browser: false
    playground: false
```

{@import ../generated-markdown/ServeConfig.generated.md}

