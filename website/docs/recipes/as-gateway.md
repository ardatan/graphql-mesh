---
id: as-gateway
title: Mesh as Gateway
sidebar_label: Mesh as Gateway
---

You can use GraphQL Mesh as a gateway for your data sources. CLI's `serve` command creates a GraphQL Endpoint with GraphQL Playground.

```bash
mesh serve
```

You can configure `serve` command like below in `.meshrc.yml`;

```yaml
serve: 
    port: 5000
```

{@import ../generated-markdown/ServeConfig.generated.md}

![GraphQL Mesh](/img/as-gateway.png)
