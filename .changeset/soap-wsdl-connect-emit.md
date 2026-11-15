---
'@omnigraph/soap': major
'@graphql-mesh/transport-rest': minor
---

SOAP WSDL loader emits `@source` / `@connect` (JSONSelection Envelope + XML codec via `transport-rest`) instead of `@soap`. Removes the `@graphql-mesh/transport-soap` package — breaking cutover with no legacy `@soap` emit or dual-run.
