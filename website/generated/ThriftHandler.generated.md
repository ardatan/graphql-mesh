
* `hostName` (type: `String`, required) - The name of the host to connect to.
* `port` (type: `Int`, required) - The port number to attach to on the host.
* `path` (type: `String`) - The path on which the Thrift service is listening. Defaults to '/thrift'.
* `https` (type: `Boolean`) - Boolean value indicating whether to use https. Defaults to false.
* `protocol` (type: `String (binary | compact | json)`) - Name of the Thrift protocol type to use. Defaults to 'binary'.
* `serviceName` (type: `String`, required) - The name of your service. Used for logging.
* `operationHeaders` (type: `JSON`) - JSON object representing the Headers to add to the runtime of the API calls
* `schemaHeaders` (type: `JSON`) - If you are using a remote URL endpoint to fetch your schema, you can set headers for the HTTP request to fetch your schema.
* `idl` (type: `String`, required) - Path to IDL file