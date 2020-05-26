---
id: as-gateway
title: Mesh as Gateway
sidebar_label: Mesh as Gateway
---

You can use GraphQL Mesh as a gateway for your data sources. CLI's `serve` command creates a GraphQL Endpoint with GraphQL Playground.

```bash
mesh serve
```

Here are the list of options for `serve` command;

- `port`: TCP Port to listen (default: `3000`)
- `fork`: Spawn multiple server instances as node clusters (default: `1`)
- `example-query`: Provide an example query or queries for GraphQL Playground

![GraphQL Mesh](/img/as-gateway.png)
