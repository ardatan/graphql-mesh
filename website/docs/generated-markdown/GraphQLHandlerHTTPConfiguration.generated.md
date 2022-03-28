
* `endpoint` (type: `String`, required) - A url or file path to your remote GraphQL endpoint.
If you provide a path to a code file(js or ts),
other options will be ignored and the schema exported from the file will be used directly.
* `schemaHeaders` (type: `Any`) - JSON object representing the Headers to add to the runtime of the API calls only for schema introspection
You can also provide `.js` or `.ts` file path that exports schemaHeaders as an object
* `operationHeaders` (type: `JSON`) - JSON object representing the Headers to add to the runtime of the API calls only for operation during runtime
* `useGETForQueries` (type: `Boolean`) - Use HTTP GET for Query operations
* `method` (type: `String (GET | POST)`) - HTTP method used for GraphQL operations
* `customFetch` (type: `Any`) - Path to a custom W3 Compatible Fetch Implementation
* `webSocketImpl` (type: `String`) - Path to a custom W3 Compatible WebSocket Implementation
* `introspection` (type: `String`) - Path to the introspection
You can seperately give schema introspection
* `multipart` (type: `Boolean`) - Enable multipart/formdata in order to support file uploads
* `subscriptionsProtocol` (type: `String (SSE | WS | LEGACY_WS)`) - SSE - Server Sent Events
WS - New graphql-ws
LEGACY_WS - Legacy subscriptions-transport-ws
* `retry` (type: `Int`) - Retry attempts if fails
* `timeout` (type: `Int`) - Timeout in milliseconds
* `batch` (type: `Boolean`) - Enable/Disable automatic query batching