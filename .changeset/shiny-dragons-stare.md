---
'@graphql-mesh/fusion-runtime': patch
---

If the first poll fails, keep polling but fail on requests
If any poll fails in somewhere, keep polling but keep using the last successful supergraph

So if the CDN is down at some point, the gateway will keep polling the supergraph, but will keep using the last successful supergraph. This is useful for cases where the CDN is down, but the supergraph is still available.
