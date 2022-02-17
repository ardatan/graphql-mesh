---
id: type-merging
title: Type Merging Transform
sidebar_label: Type Merging
---

This transform helps you to use [Type Merging](https://graphql-tools.com/docs/stitch-type-merging) approach of Schema Stitching in your GraphQL Mesh sources.

> If you don't know when to use `Type Merging`, please check
[Merging types from different sources (using Type Merging)](/docs/recipes/multiple-apis#merging-types-from-different-sources-using-type-merging) chapter first.

```yml
sources:
  - name: AuthorService
    handler:
      graphql:
        endpoint: ./author-service-schema.js
    transforms:
      - typeMerging:
          queryFields:
            # No need to define which type it belongs
            # And no need to define a key for type
            # keyField assigns to that type automatically
            - queryFieldName: authors
              # Mesh automatically does batching if return type is a list
              keyField: id
            # keyArg: ids <-- This is needed if you have multiple args
            #                for that query field
  - name: BookService
    handler:
      graphql:
        endpoint: ./book-service-schema.js
    transforms:
      # Rename type names and field names to let stitching merger merges them
      - rename:
          renames:
            - from:
                type: AuthorWithBooks
              to:
                type: Author
            - from:
                type: Query
                field: authorWithBooks
              to:
                type: Query
                field: author
      - typeMerging:
          queryFields:
            # This doesn't use batching
            # It does regular stitching
            - queryFieldName: book
              keyField: id
            - queryFieldName: author
              keyField: id
```

> You can check out our example that uses Type Merging

<iframe
     src="https://codesandbox.io/embed/github/Urigo/graphql-mesh/tree/master/examples/type-merging-batching-example?fontsize=14&hidenavigation=1&theme=dark&module=%2F.meshrc.yml"
     style={{width:"100%", height:"500px", border:"0", borderRadius: "4px", overflow:"hidden"}}
     title="federation-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin" />

## Config API Reference

{@import ../generated-markdown/TypeMergingConfig.generated.md}
