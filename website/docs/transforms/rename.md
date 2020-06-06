---
id: rename
title: Rename Transform
sidebar_label: Rename
---

The `rename` transform allow you rename GraphQL types and GraphQL fields easily. 

```
yarn add @graphql-mesh/transform-rename
```

## How to use?

Add the following configuration to your Mesh config file:

```yml
transforms:
  - rename:
      - from: ApiUser
        to: User
```

## Config API Reference

{@import ../generated-markdown/RenameTransformObject.generated.md}
