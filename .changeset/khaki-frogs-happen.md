---
'@graphql-mesh/serve-runtime': patch
---

Environment variables are not used, MeshServeConfig contains all necessary configuration options

@graphql-mesh/serve-runtime is for programmatic usage and therefore should have explicit configuration and assume no defaults. Keep in mind that this doesn't change @graphql-mesh/serve-cli, which can still be configured using environment variables.
