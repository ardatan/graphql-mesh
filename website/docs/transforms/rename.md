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
      mode: bare | wrap
      renames:
        - from:
            type: ApiUser
          to:
            type: User
        - from:
            type: Query
            field: apiUser
          to:
            type: Query
            field: user
```

or you can use regular expressions to rename multiple types, fields or both

```yml
- rename:
    mode: bare | wrap
    renames:
      - from:
          type: Api(.*)
        to:
          type: $1
        useRegExpForTypes: true

      - from:
          type: Query
          field: api(.*)
        to:
          type: Query
          field: $1
        useRegExpForFields: true
```

> For information about "bare" and "wrap" modes, please read the [dedicated section](/docs/transforms/transforms-introduction#two-different-modes).

## Config API Reference

{@import ../generated-markdown/RenameTransform.generated.md}
