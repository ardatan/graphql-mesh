---
'json-machete': minor
'@omnigraph/json-schema': minor
'@omnigraph/openapi': minor
---

If a component(response, requestBody, header or parameter) defined in OpenAPI schema, and its schema doesn't have a title, use the component object's title for that schema

```yml
components:
  parameters:
    Foo:
      title: Foo
      in: query
      schema:
        # OAS Loader adds the following title
        # title: Foo_parameter
        type: string
        enum:
          - a
          - b
```
