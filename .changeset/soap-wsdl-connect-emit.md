---
'@omnigraph/soap': minor
'@graphql-mesh/transport-connect': minor
---

SOAP WSDL loader emits `@source` / `@connect` (JSONSelection Envelope + XML codec via `transport-connect`) instead of `@soap`. Removes the `@graphql-mesh/transport-soap` package - breaking cutover with no legacy `@soap` emit or dual-run.
