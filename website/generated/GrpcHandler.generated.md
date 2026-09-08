
* `endpoint` (type: `String`, required) - gRPC Endpoint
* `source` -  - gRPC Proto file that contains your protobuf schema
OR
Use a binary-encoded or JSON file descriptor set file One of: 
  * `object`: 
    * `file` (type: `String`, required)
    * `load` (type: `Object`): 
      * `defaults` (type: `Boolean`)
      * `includeDirs` (type: `Array of String`)
  * `String`
* `requestTimeout` (type: `Int`) - Request timeout in milliseconds
Default: 200000
* `credentialsSsl` (type: `Object`) - SSL Credentials: 
  * `rootCA` (type: `String`)
  * `certChain` (type: `String`)
  * `privateKey` (type: `String`)
* `useHTTPS` (type: `Boolean`) - Use https instead of http for gRPC connection
* `metaData` (type: `JSON`) - MetaData
* `prefixQueryMethod` (type: `Array of String`) - prefix to collect Query method default: list, get
* `selectQueryOrMutationField` (type: `Array of Object`) - Allows to explicitly override the default operation (Query or Mutation) for any gRPC operation: 
  * `type` (type: `String (query | mutation | Query | Mutation)`, required)
  * `fieldName` (type: `String`, required)
* `schemaHeaders` (type: `JSON`) - HTTP headers when `source` points to a remote `.graphql` SDL
* `reflectionMetadata` (type: `JSON`) - gRPC metadata sent with server-reflection requests (e.g. routing / auth metadata).
Only used when loading the schema via reflection (no `source` / empty `source`).
* `channelOptions` (type: `JSON`) - Channel options passed to the gRPC client (e.g. grpc.max_receive_message_length, grpc.keepalive_time_ms).
See https://grpc.github.io/grpc/core/group__grpc__arg__keys.html