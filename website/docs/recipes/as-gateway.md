---
id: as-gateway
title: Mesh as Gateway
sidebar_label: Mesh as Gateway
---

<p align="center">
  <img src="/img/as-gateway.png" width="450" alt="Apollo Federation" />
  <br/>
</p>

You can use GraphQL Mesh as an HTTP gateway proxy for your data sources. GraphQL Mesh provides you an HTTP server with [Express](https://expressjs.com/), [GraphQL Helix](https://github.com/contrawork/graphql-helix), [GraphQL-WS](https://github.com/enisdenjo/graphql-ws#readme) and [GraphiQL Explorer](https://github.com/OneGraph/graphiql-explorer) with the bunch of configurable features out-of-box which can be seen [here](/docs/recipes/mesh-as-gateway).

There are two commands for GraphQL Mesh's HTTP Server;

- `dev` commands generates the unified schema without using any existing artifacts on the disk and it introspects all the schemas but it doesn't save it.
- `start` commands generates the unified schema by using the existing artifacts previously created by `mesh build` command. [Learn more about Mesh artifacts.](/docs/recipes/build-mesh-artifacts).

You can also point to a specific directory which contains the source files (`.meshrc.yaml`, etc.)

```bash
mesh dev --dir some/path/to-configuration/
```

GraphQL Mesh's HTTP Server can be configured using `serve` command like below;

```yaml
serve:
    port: 5000
```

{@import ../generated-markdown/ServeConfig.generated.md}

