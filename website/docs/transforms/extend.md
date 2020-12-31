---
id: extend
title: Extend Transform
sidebar_label: Extend
---

`extend` transform allows you to extend the schema of the source directly on the source level. But this might cause inconsistency if the schema heavily relies on that schema's existing structure. This transform can be used for the data sources that return fixed results. For example, OpenAPI and JSON Schema handler are good examples for this kind of sources while Postgraphile and GraphQL handlers aren't because they rely on their existing structure. The resolvers added by this transform accesses directly to `root`, `args` and `context` of that schema, so you cannot use `selectionSet` (actually you shouldn't, because this is not a root level transform).


```yml
transforms:
  - extend: 
        typeDefs: ./someTypeDefs.graphql
        resolvers: ./someResolvers.js
```

You can extend the existing types in `someTypeDefs.graphql`;

```graphql
    extend type User {
        fullName: String
    }
```

And define resolvers for those types;

```js
module.exports = {
    User: {
        fullName: user => `${user.firstName} ${user.lastName}` // e.g. `user` is the raw result returned by your data source
    }
}
```

{@import ../generated-markdown/ExtendTransform.generated.md}
