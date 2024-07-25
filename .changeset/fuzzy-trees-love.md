---
'@graphql-mesh/serve-runtime': patch
---

Request ID;

If user provides a request id with `x-request-id` header, it will be used as a request id otherwise Mesh generates a random UUID as a request id.
Then it will return the request id in the response headers with `x-request-id` header.

This `x-request-id` is also available in upstream headers as `request-id` for the upstream services to use.

This request id will also be added to the logs.
