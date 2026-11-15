---
'@omnigraph/soap': major
'@graphql-mesh/transport-connector': minor
---

SOAP WSDL loader emits `@source` / `@connect` (JSONSelection Envelope + XML codec via `transport-connector`) instead of `@soap`. Removes the `@graphql-mesh/transport-soap` package - breaking cutover with no legacy `@soap` emit or dual-run.
