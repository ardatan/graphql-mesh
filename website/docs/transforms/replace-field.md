---
id: replace-field
title: Replace Field
sidebar_label: Replace Field
---

The `replace-field` transform allows you to replace configuration properties of a GraphQL field (source) with the ones of another field (target).

This is extremely useful when you want to hoist field values from one subfield to its parent, but it can be customised to completely replace and/or compose resolve functions with a great degree of customisation.

```
yarn add @graphql-mesh/transform-replace-field
```

> Note: currently this transform supports `bare` mode only. For information about "bare" and "wrap" modes, please read the [dedicated section](/docs/transforms/transforms-introduction#two-different-modes).

## How to use?

Imagine you have generated your schema from a data source you don't control, and the generated schema looks like this:

```graphql
type Query {
  books: BooksApiResponse
}

type BooksApiResponse {
  books: [Book]
}

type Book {
  title: String!
  author: Author!
  code: String
}

type Author {
  name: String!
  age: Int!
}
```

As you can see you would have to request a GraphQL Document like the following, to retrieve the list of books:

```graphql
{
  books {
    books {
      title
      author
    }
  }
}
```

This is not ideal because you have to request `books` as a child of `books`, so in this case hoisting the value from child to parent would lead to a cleaner schema and request Document.

To achieve this you can add the following configuration to your Mesh config file:

```yml
transforms:
  - replace-field:
      replacements:
        - from:
            type: Query
            field: books
          to:
            type: BooksApiResponse
            field: books
          scope: hoistValue
```

This will transform your schema from what you had above, to this:

```graphql
type Query {
  books: [Book]
}

type Book {
  title: String!
  author: Author!
  code: String
}

type Author {
  name: String!
  age: Int!
}
```

Allowing you to request a GraphQL document like this:

```graphql
{
  books {
    title
    author
  }
}
```

## How the transform works

Let's understand more about how this transform works.
With `from` you define your source, which field in the schema you want to replace.

```yaml
- from:
    type: Query
    field: books
```

In this case, we want to replace the field `books` in type `Query`, which by default has the type `BooksApiResponse`.

With `to` you define your target, and so which field should replace your identified source field.

```yaml
to:
  type: BooksApiResponse
  field: books
```

To summarise, with the configuration above we want field `books` in type `Query` to be replaced from being of type `BooksApiResponse` to become type `[Book]`.

Finally, since we no longer have any reference to `BooksApiResponse` this becomes a loose type, and so the transform will purge it from the GraphQL schema.

## Transform scopes

In the paragraph above we've explored how to use the transform to replace field Types.
The transform always replaces the type of the source field with the one of the target.

However, the transform also allows you to pass a scope property, which values can be `config` or `hoistValue`.

We could say that the scope property could also take a `type` value, but since it's the minimum requirement to replace the Type, this is considered the default scope and so it wouldn't make sense to pass it when you desire just this behaviour.

### scope: config

When you pass `scope: config` the transform will replace the full field config.
A field config includes properties of the field such as description, type, args, resolve, subscribe, deprecationReason, extensions, astNode.

As you can see this is very comprehensive as it includes things like arguments as well as the resolve and subscribe functions.

This can be useful when you have custom resolve functions on your target field and so you are happy to replace the source field entirely.
However, you should be careful in doing this when you fully understand the implications of the behaviour for your replaced field.

### scope: hoistValue

We have seen how `hoistValue` can be useful in the full example described in the "How to use?" paragraph.

Once again, by default, the transform will replace the Type of the field only.
When passing `scope: hoistValue` in addition to replacing the Type, the transform will wrap the resolve function of the original field (source) with an extra function. This function intercepts the return value of the resolver to ultimately return only the direct child property that has the same name as the target field; hence performing value hoisting.

Taking into account the original schema shared above, originally `Query.books` would return a value like this:

```js
{
  books: {
    books: [{ title: 'abc', author: 'def' }, { title: 'ghi', author: 'lmn' }]
  }
}
```

But the wrapping function applied to the original resolver, when passing `hoistValue` scope, will change the value above to this:

```js
{
  books: [{ title: 'abc', author: 'def' }, { title: 'ghi', author: 'lmn' }]
}
```

## Additional type definitions

The examples shared so far are simple because we wanted to replace fields with other fields that are available in the original schema.

However, sometimes you might want to replace a field Type with something that is not available in the original schema.
In this case, the transform allows you to pass additional type definitions that will be injected into your schema so that you can then use them as target field Types.

Let's have a look at a Mesh config to be applied to the GraphQL schema shared above:

```yml
transforms:
  - replace-field:
      typeDefs: |
        type NewAuthor {
          age: String
        }
      # typeDefs: ./customTypeDefs.graphql # for conveniency, you can also pass a .graphql file
      replacements:
        - from:
            type: Author
            field: age
          to:
            type: NewAuthor
            field: age
```

The config above will change type `Author` from this:

```graphql
type Author {
  name: String!
  age: Int!
}
```

To this:

```graphql
type Author {
  name: String!
  age: String
}
```

## Custom composers

Performing value hoisting or replacing the full field config is powerful, but it might not always fully satisfy custom needs.
For instance, if you applied transforms to the bare schema (such as field renaming) the built-in value hoisting functionality won't work, because you'd need to hoist the child property provided by the original schema, and not the renamed version.

The transform allows you to assign composers to each replace rule, which lets you define your custom logic on top of fields' resolve functions.

A composer is a function that wraps the resolve function, giving you access to this before it is executed. You can then intercept its output value so that finally you can also define a custom return value.

Let's look at an example.
Currently, our `Book` type has a `code` field, we want to replace this field and turn it into a boolean. Our logic assumes that if we have a book code, it means this book is available in our store.
Eventually, we want to completely replace `code` with `isAvailable`; as you can see this requires implementing custom logic.

```yml
transforms:
  - replace-field:
      typeDefs: |
        type NewBook {
          isAvailable: Boolean
        }
      replacements:
        - from:
            type: Book
            field: code
          to:
            type: NewBook
            field: isAvailable
          composer: ./customComposers.js#isAvailable
```

```js
// customResolvers.js

module.exports = {
  isAvailable: next => async (root, args, context, info) => {
    // 'next' is the field resolve function
    const code = await next(root, args, context, info);
    return Boolean(code);
  },
};
```

Now our `code` field will return a Boolean as per custom logic implemented through the javascript function above.


## Renaming fields

If we continue to elaborate from what we did above, when attaching composers to field resolvers to implement custom logic; it seems logical that a field that has been changed in Type and so return value, even with the addition of custom logic, has certainly evolved from the original field and so it would probably be best to rename it.

Replace-field transform allows you to do that directly as part of the replacements rules; you just need to pass the `name` property to define a new name for your target field.

Let's wrap this up by adding a finishing touch to our schema:

```yml
transforms:
  - replace-field:
      typeDefs: |
        type NewBook {
          isAvailable: Boolean
        }
      replacements:
        - from:
            type: Query
            field: books
          to:
            type: BooksApiResponse
            field: books
          scope: hoistValue
        - from:
            type: Book
            field: code
          to:
            type: NewBook
            field: isAvailable
          composer: ./customResolvers.js#isAvailable
          name: isAvailable
```

And now we have the following shiny GraphQL schema:

```graphql
type Query {
  books: [Book]
}

type Book {
  title: String!
  author: Author!
  isAvailable: Boolean
}

type Author {
  name: String!
  age: Int!
}
```

## Config API Reference

{@import ../generated-markdown/ReplaceFieldTransformConfig.generated.md}
