
* `endpoint` (type: `String`, required) - gRPC Endpoint
* `protoFilePath` -  - gRPC Proto file that contains your protobuf schema One of: 
  * `object`: 
    * `file` (type: `String`, required)
    * `load` (type: `Object`): 
      * `defaults` (type: `Boolean`)
      * `includeDirs` (type: `Array of String`)
  * `String`
* `descriptorSetFilePath` -  - Use a binary-encoded or JSON file descriptor set file One of: 
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
* `useReflection` (type: `Boolean`) - Use gRPC reflection to automatically gather the connection
* `prefixQueryMethod` (type: `[String]`) - prefix to collect Query method default: list, get