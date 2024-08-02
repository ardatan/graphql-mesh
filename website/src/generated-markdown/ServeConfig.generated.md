
* `fork` -  - Spawn multiple server instances as node clusters (default: `1`) One of: 
  * `Int`
  * `Boolean`
* `port` -  - TCP Port to listen (default: `4000`) One of: 
  * `Int`
  * `String`
* `hostname` (type: `String`) - The binding hostname (default: `localhost`)
* `cors` (type: `Object`) - Configuration for CORS: 
  * `origin` (type: `Any`)
  * `allowedHeaders` (type: `Array of String`)
  * `exposedHeaders` (type: `Array of String`)
  * `credentials` (type: `Boolean`)
  * `maxAge` (type: `Int`)
  * `preflightContinue` (type: `Boolean`)
  * `optionsSuccessStatus` (type: `Int`)
* `staticFiles` (type: `String`) - Path to your static files you want to be served with GraphQL Mesh HTTP Server
* `playground` (type: `Boolean`) - Show GraphiQL Playground
* `sslCredentials` (type: `Object`) - SSL Credentials for HTTPS Server
If this is provided, Mesh will be served via HTTPS: 
  * `key` (type: `String`, required)
  * `cert` (type: `String`, required)
* `endpoint` (type: `String`) - Path to GraphQL Endpoint (default: /graphql)
* `browser` -  - Path to the browser that will be used by `mesh serve` to open a playground window in development mode
This feature can be disabled by passing `false` One of: 
  * `String`
  * `Boolean`
* `playgroundTitle` (type: `String`) - Title of GraphiQL Playground
* `batchingLimit` (type: `Int`) - Enable and define a limit for [Request Batching](https://github.com/graphql/graphql-over-http/blob/main/rfcs/Batching.md)
* `healthCheckEndpoint` (type: `String`) - Endpoint for [Health Check](https://the-guild.dev/graphql/yoga-server/docs/features/health-check)
* `extraParamNames` (type: `Array of String`) - By default, GraphQL Mesh does not allow parameters in the request body except `query`, `variables`, `extensions`, and `operationName`.

This option allows you to specify additional parameters that are allowed in the request body.

@default []

@example ['doc_id', 'id']