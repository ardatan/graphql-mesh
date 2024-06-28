---
'@graphql-mesh/serve-runtime': patch
'@graphql-mesh/serve-cli': patch
---

Change the default behavior of Serve Runtime

If no `supergraph` or `hive` or `proxy` is provided

- If `HIVE_CDN_ENDPOINT` and `HIVE_CDN_TOKEN` are provided, use them to fetch the supergraph from the Hive CDN
- If not, check for a local supergraph file at `./supergraph.graphql`

