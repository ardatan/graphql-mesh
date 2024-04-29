---
"@graphql-mesh/types": patch
"@graphql-mesh/http": patch
"@graphql-mesh/cli": patch
---

Previously GraphQL Yoga also had a health check endpoint in `/health` path while Mesh's health check endpoint is `/healthcheck`. Now they are both aligned.
Also now you can customize the health check endpoint within Mesh Configuration using `serve.healthCheckEndpoint` key. Default value is `/healthcheck.

```yaml
serve:
  healthCheckEndpoint: /health
```

**Action Required:**
If you are using GraphQL Yoga's endpoint `/health`, instead of `/healthcheck`, you should update your health check endpoint to `/health` in the configuration like above to keep the behavior.
