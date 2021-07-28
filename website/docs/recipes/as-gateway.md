---
id: as-gateway
title: Mesh as Gateway
sidebar_label: Mesh as Gateway
---

<p align="center">
  <img src="/img/as-gateway.png" width="450" alt="Apollo Federation" />
  <br/>
</p>

You can use GraphQL Mesh as a gateway for your data sources. CLI's `dev` command creates a GraphQL Endpoint with GraphQL Playground.

```bash
mesh dev
```
You can also point to a specific directory which contains the source files (`.meshrc.yaml`, etc.)

```bash
mesh dev --dir some/path/to-configuration/
```

You can configure `dev` command like below in `.meshrc.yml`;

```yaml
serve:
    port: 5000
```

{@import ../generated-markdown/ServeConfig.generated.md}

