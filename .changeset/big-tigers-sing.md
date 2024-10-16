---
'@graphql-mesh/plugin-opentelemetry': minor
---

Make it possible to run with externally initialized OpenTelemetry NodeSDK.

This fixes the issue of seeing a lot of errors on the form `Error: @opentelemetry/api: Attempted duplicate registration of API: trace`.
