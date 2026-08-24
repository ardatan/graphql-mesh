---
"@omnigraph/json-schema": patch
"@omnigraph/openapi": patch
---

**Fix: honor loader-level `queryStringOptions` as fallback in `@httpOperation` directives**

Previously, when a `queryStringOptions` was configured at the loader (source) level for OpenAPI or JSON Schema subgraphs, the generated `@httpOperation` directives did **not** inherit that option unless every individual operation explicitly set its own `queryStringOptions`. This meant that loader-level query-string serialization config (e.g. `allowDots`, `arrayFormat`) was silently ignored at execution time.

### What changed

In `addExecutionDirectivesToComposer`, each operation now falls back to the loader-level `queryStringOptions` when the operation itself does not define one:

```ts
queryStringOptions:
  'queryStringOptions' in operationConfig
    ? operationConfig.queryStringOptions
    : queryStringOptions   // ← new: inherit from loader level
```

This aligns with the documented contract where loader-level options apply globally to all operations.

### Usage example

**OpenAPI** – `queryStringOptions` set once for all operations:

```ts
// mesh.config.ts
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('MyApi', {
        source: './openapi.yaml',
        endpoint: 'https://api.example.com',
        // Applied to every operation that doesn't override it
        queryStringOptions: {
          allowDots: true,       // serialize nested objects as a.b.c=1
          arrayFormat: 'repeat', // serialize arrays as a=1&a=2
        },
      }),
    },
  ],
});
```

**JSON Schema** – same option at the loader level:

```ts
import { loadGraphQLSchemaFromJSONSchemas } from '@omnigraph/json-schema';

const schema = await loadGraphQLSchemaFromJSONSchemas('MyApi', {
  endpoint: 'https://api.example.com',
  queryStringOptions: {
    arrayFormat: 'brackets', // foo[]=1&foo[]=2
  },
  operations: [...],
});
```

### Affected packages

| Package | Change |
|---|---|
| `@omnigraph/json-schema` | Core fix in `addExecutionDirectivesToComposer` |
| `@omnigraph/openapi` | Inherits fix via `@omnigraph/json-schema` |

Fixes #8760
