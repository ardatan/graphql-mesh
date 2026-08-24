---
'@graphql-mesh/transport-grpc': patch
---

gRPC: surface `ServiceError` as GraphQL errors with `extensions.grpc`

Upstream gRPC `ServiceError`s are no longer masked as generic internal errors.
They are returned as GraphQL errors with `extensions.code: DOWNSTREAM_SERVICE_ERROR`
and structured details under `extensions.grpc`:

```json
{
  "errors": [
    {
      "message": "4 DEADLINE_EXCEEDED: Deadline exceeded",
      "extensions": {
        "code": "DOWNSTREAM_SERVICE_ERROR",
        "grpc": {
          "code": 4,
          "status": "DEADLINE_EXCEEDED",
          "details": "Deadline exceeded",
          "metadata": {}
        }
      }
    }
  ]
}
```

Only gRPC `ServiceError` values are wrapped; other thrown values are left unchanged.
