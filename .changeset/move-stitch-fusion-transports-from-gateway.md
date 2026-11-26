---
'@graphql-tools/stitch': patch
'@graphql-tools/stitching-directives': patch
'@graphql-tools/delegate': patch
'@graphql-tools/wrap': patch
'@graphql-tools/batch-delegate': patch
'@graphql-tools/batch-execute': patch
'@graphql-tools/federation': patch
'@graphql-tools/executor-common': patch
'@graphql-tools/executor-http': patch
'@graphql-tools/executor-graphql-ws': patch
'@graphql-mesh/fusion-runtime': patch
'@graphql-mesh/transport-common': patch
'@graphql-mesh/transport-http': patch
'@graphql-mesh/transport-http-callback': patch
'@graphql-mesh/transport-ws': patch
---

Source of these packages moved from `graphql-hive/gateway` into this repo. npm names and import paths are unchanged. Hive Gateway will consume published versions from Mesh after cutover. Package-level federation benches live under `bench/federation`; Gateway e2e memtest/bench CI stays on the Gateway repo and continues to measure Gateway impact.
