---
"@graphql-mesh/json-schema": minor
"json-machete": minor
"@omnigraph/json-schema": minor
---

**New `noDeduplication` flag**

By default, JSON Schema handler tries to deduplicate similar JSON Schema types;

Let's say we have the following JSON Schema;

```json
{
  "definitions": {
    "Book": {
    "type": "object",
    "title": "Book",
    "properties": {
      "title": {
        "type": "string"
      },
      "author": {
        "type": "string"
      },
      "price": {
        "type": "number"
      },
      "similarBooks": {
        "type": "array",
        "items": {
          "$ref": "#/definitions/SimilarBook"
        }
      }
    }
    },
    "SimilarBook": {
      "type": "object",
      "title": "Book",
      "properties": {
        "title": {
          "type": "string"
        },
        "author": {
          "type": "string"
        },
        "price": {
          "type": "number"
        },
        "similarBooks": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/SimilarBook"
          }
        }
      }
    }
  }
}
```

And the result will be the following by default;

```graphql
type Book {
  title: String
  author: String
  price: Float
  similarBooks: [Book]
}
```

But if you set this flag true, it will not deduplicate similar JSON Schema types;

```graphql
type Book {
  title: String
  author: String
  price: Float
  similarBooks: [SimilarBook]
}

type SimilarBook {
  title: String
  author: String
  price: Float
  similarBooks: [SimilarBook]
}
```

