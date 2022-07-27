---
"@graphql-mesh/json-schema": patch
"@omnigraph/json-schema": patch
"@graphql-mesh/types": patch
---

Now you can configure JSON Schema handler how to stringify query parameters;

```yml
queryStringOptions:
  indices: false
  arrayFormat: brackets
```

Check out the configuration schema to see the options;
https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/yaml-config.graphql#L25
