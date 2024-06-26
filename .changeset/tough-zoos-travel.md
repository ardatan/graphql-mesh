---
'@graphql-mesh/json-schema': patch
'@omnigraph/json-schema': patch
'@graphql-mesh/transport-rest': patch
---

New option for query string parameters `jsonStringify`;

Now either under the operation or globally, you can set `jsonStringify` to `true` to stringify nested query string parameters as JSON.

```yaml
operations:
  - type: Query
    field: books
    method: GET
    path: /books
    queryStringOptions:
      jsonStringify: true
    queryParamArgMap:
      page: page
    argTypeMap:
      page:
        type: object
        additionalProperties: false
        properties:
          limit:
            type: integer
          offset:
            type: integer
    responseSample:
      books:
        - title: "Book 1"
        - title: "Book 2"
```

Then the URL will be `/books?page={"limit":10,"offset":0}`, as you can see `page` is stringified as JSON.
