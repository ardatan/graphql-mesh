---
id: type-merging
title: Type Merging Transform
sidebar_label: Type Merging
---

This transform helps you to use [Type Merging](https://graphql-tools.com/docs/stitch-type-merging) approach of Schema Stitching in your GraphQL Mesh sources.



<p>&nbsp;</p>

------

<p>&nbsp;</p>


## What is Type Merging?

Take an example Mesh Gateway with two different GraphQL sources `Books` and `Authors`, defined as follows:

```graphql
# Authors
type Query {
  authors(ids: [ID!]): [Author!]!
  author(id: ID!): Author!
}

type Author {
  id: ID!
  name: String!
}
```

```graphql
# Books
type Query {
  books(ids: [ID!]): [Book!]!
  book(id: ID!): Book!
  authorWithBooks(id: ID!): AuthorWithBooks!
  authorsWithBooks(ids: [ID!]): [AuthorWithBooks!]!
}

type Book {
  id: ID!
  title: String!
  authorId: ID!
}

type AuthorWithBooks {
  id: ID!
  books: [Book!]!
}
```

And you renamed `AuthorWithBooks` to `Author` using [`Rename`](/docs/transforms/rename) transform.
```yaml
- sources:
  - name: BookService
    handler:
      # ...
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
```

then you expect the following query works fine;

```graphql
{
  author(id: 0) {
    id # This field is common
    name # This field is from `AuthorService`
    books { # This field is from `BookService`
      id
      title
    }
  }
}
```

But it won't work because Mesh doesn't know which field belongs to where and how to combine those. You could add `additionalResolvers` then extract `books` from `AuthorWithBooks` then return it as `books` field of `Author` type, but this sounds a little bit overhead. So let's try Type Merging here;

We have Type Merging transform to teach Mesh how to fetch entities from different sources;

```yaml
sources:
  - name: AuthorService
    handler:
      # ...
    transforms:
      - typeMerging:
          queryFields:
            # No need to define which type it belongs
            # And no need to define a key for type
            # keyField assigns to that type automatically
            - queryFieldName: author
              keyField: id
            # keyArg: id <-- This is needed if you have multiple args
            #                for that query field
  - name: BookService
    handler:
      # ...
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
            - from:
                type: Query
                field: authorsWithBooks
              to:
                type: Query
                field: authors
      - typeMerging:
          queryFields:
            # This doesn't use batching
            # It does regular stitching
            - queryFieldName: book
              keyField: id
            - queryFieldName: author
              keyField: id
```

Then now, our query will work as expected!


### Prevent N+1 problem with Type Merging

The example above works fine, but there is an N+1 problem. It sends `n` requests for `n` entities. But we have `authors` and `books`. Type Merging is smart enough to handle batching if you point it to a field that returns a list of entities. Let's update our configuration for this;

```yaml
sources:
  - name: AuthorService
    handler:
      # ...
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
      # ...
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
            - from:
                type: Query
                field: authorsWithBooks
              to:
                type: Query
                field: authors
      - typeMerging:
          queryFields:
            - queryFieldName: books
              keyField: id
            - queryFieldName: authors
              keyField: id
```

And now it batches the requests to the inner sources.



<p>&nbsp;</p>

------

<p>&nbsp;</p>


## Using the Type Merging Transform


```yaml
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



<p>&nbsp;</p>

------

<p>&nbsp;</p>


## Config API Reference

{@import ../generated-markdown/TypeMergingConfig.generated.md}
