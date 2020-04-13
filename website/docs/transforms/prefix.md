---
id: prefix
title: Prefix Transform
sidebar_label: Prefix
---

The `prefix` transform allow you prefix GraphQL types and GraphQL root operations (under `Query/Mutation`). 

You can use it to easily "namespace" APIs in your unified API and avoid conflicts. 

```
yarn add @graphql-mesh/transform-prefix
```

## How to use?

Add the following configuration to your Mesh config file:

```yml
transforms:
  - prefix:
      value: MyApi_
```

> You can check out our example that uses schema stitching with a PostgreSQL datasource and prefix transform.
[Click here to open the example on GitHub](https://github.com/Urigo/graphql-mesh/tree/master/examples/postgres-geodb)

## Config API Reference

{@import ../generated-markdown/PrefixTransformConfig.generated.md}
