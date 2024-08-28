---
'@graphql-mesh/hmac-upstream-signature': patch
'@graphql-mesh/plugin-prometheus': patch
'@graphql-mesh/plugin-jwt-auth': patch
'@graphql-mesh/serve-runtime': patch
'@graphql-mesh/serve-cli': patch
---

Adding these plugins to serve-runtime by default, and make them configurable through the configuration;

- `useResponseCache`
- `useContentEncoding`
- `useDeferStream`
- `useExecutionCancellation`
- `useUpstreamCancellation`
- `useDisableIntrospection`
- `useCSRFPrevention`
- `useCustomAgent`
- `useGenericAuth`
- `useHMACUpstreamSignature`
- `useWebhooks`

In addition, the following ones are added to the serve-cli:

- `useJWT`
- `usePrometheus`
- `useOpenTelemetry`
- `useRateLimit`
