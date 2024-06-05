---
'@graphql-mesh/soap': patch
'@omnigraph/json-schema': patch
'@omnigraph/openapi': patch
'@graphql-mesh/transport-rest': patch
'@graphql-mesh/transport-soap': patch
'@graphql-mesh/types': patch
---

Introduce a standard Upstream Error Format for HTTP-based sources;

So all sources throw an error will have the extensions in the following format;

```json5
{
  "extensions": {
    "request": { // The details of the request made to the upstream service
      "endpoint": "https://api.example.com",
      "method": "GET",
    },
    "http": { // The details of the HTTP response from the upstream service
      "status": 401,
      "statusText": "Unauthorized",
      "headers": {
        "content-type": "application/json"
      }
    },
    "responseBody": { // The body returned by the upstream service
      "error-message": "Unauthorized access",
    },
  }
}
```
