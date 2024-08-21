---
'@graphql-mesh/transport-common': patch
'@graphql-mesh/transport-rest': patch
'@graphql-mesh/transport-soap': patch
---

Introduce a standard Upstream Error Format for HTTP-based sources;

So all sources throw an error will have the extensions in the following format;

```json
{
  "extensions": {
    "request": { // The details of the request made to the upstream service
      "endpoint": "https://api.example.com",
      "method": "GET",
    },
    "response": { // The details of the HTTP response from the upstream service
      "status": 401,
      "statusText": "Unauthorized",
      "headers": {
        "content-type": "application/json"
      },
      "body": { // The raw body returned by the upstream service
        "error-message": "Unauthorized access",
      }
    },
  }
}
```
