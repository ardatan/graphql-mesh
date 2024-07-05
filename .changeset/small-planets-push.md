---
'@graphql-mesh/serve-runtime': patch
---

Close subscriptions on disposal and schema change with different codes.

When the server gets disposed (on shutdown), all active subscriptions will complete emitting the following execution error:

```json
{
  "errors": [
    {
      "extensions": {
        "code": "SHUTTING_DOWN",
      },
      "message": "subscription has been closed because the server is shutting down",
    },
  ],
}
```

However, when the server detects a schema change, all active subscriptions will complete emitting the following execution error:

```json
{
  "errors": [
    {
      "extensions": {
        "code": "SUBSCRIPTION_SCHEMA_RELOAD",
      },
      "message": "subscription has been closed due to a schema reload",
    },
  ],
}
```
