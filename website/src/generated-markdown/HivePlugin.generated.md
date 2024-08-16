
* `enabled` -  - If this expression is truthy, mocking would be enabled
You can use environment variables expression, for example: `process.env.MOCKING_ENABLED != null` One of: 
  * `Boolean`
  * `String`
* `token` (type: `String`) - Access Token for Usage Reporting
* `agent` (type: `Object`) - Agent Options: 
  * `name` (type: `String`)
  * `logger` (type: `Any`)
  * `timeout` (type: `Int`) - 30s by default
  * `maxRetries` (type: `Int`) - 5 by default
  * `minTimeout` (type: `Int`) - 200 by default
  * `sendInterval` (type: `Int`) - Send reports in interval (defaults to 10_000ms)
  * `maxSize` (type: `Int`) - Max number of traces to send at once (defaults to 25)
* `usage` (type: `Object`) - Collects schema usage based on operations: 
  * `clientInfo` (type: `Object`) - Extract client info from GraphQL Context: 
    * `name` (type: `String`) - Extract client name
Example: `{context.headers['x-client-name']}`
    * `version` (type: `String`) - Extract client version
Example: `{context.headers['x-client-version']}`
  * `max` (type: `Int`) - Hive uses LRU cache to store info about operations.
This option represents the maximum size of the cache.
Default: 1000
  * `ttl` (type: `Int`) - Hive uses LRU cache to store info about operations.
This option represents the maximum age of an unused operation in the cache.
Default: no ttl
  * `exclude` (type: `Array of String`) - A list of operations (by name) to be ignored by Hive.
  * `sampleRate` (type: `Float`) - Sample rate to determine sampling.
0.0 = 0% chance of being sent
1.0 = 100% chance of being sent
Default: 1.0
  * `processVariables` (type: `Boolean`) - (Experimental) Enables collecting Input fields usage based on the variables passed to the operation.
Default: false
  * `sampler` (type: `Any`)
* `reporting` (type: `Object`) - Schema reporting: 
  * `author` (type: `String`, required) - Author of current version of the schema
  * `commit` (type: `String`, required) - Commit SHA hash (or any identifier) related to the schema version
  * `serviceName` (type: `String`)
  * `serviceUrl` (type: `String`)
* `selfHosting` (type: `Object`) - Options for self-hosting
[See more](https://github.com/kamilkisiela/graphql-hive/tree/main/packages/libraries/client#self-hosting): 
  * `graphqlEndpoint` (type: `String`, required) - Point to your own instance of GraphQL Hive API

Used by schema reporting and token info.
  * `applicationUrl` (type: `String`, required) - Address of your own GraphQL Hive application

Used by token info to generate a link to the organization, project and target.
  * `usageEndpoint` (type: `String`) - Point to your own instance of GraphQL Hive Usage API

Used by usage reporting.
* `experimental__persistedDocuments` (type: `Object`) - Experimental persisted documents configuration
[See more](https://the-guild.dev/graphql/hive/docs/features/app-deployments#persisted-documents-on-graphql-server-and-gateway): 
  * `cdn` (type: `Object`, required) - Point to your own instance of GraphQL Hive API

Used by schema reporting and token info.: 
    * `endpoint` (type: `String`, required) - CDN endpoint
    * `accessToken` (type: `String`, required) - Access Token for Persisted Documents CDN
  * `allowArbitraryDocuments` (type: `Boolean`) - Whether arbitrary documents should be allowed along-side persisted documents. false by default
  * `cache` (type: `Int`) - Maximum amount of operations that shall be kept in memory after being loaded from the CDN. 10 seconds by default