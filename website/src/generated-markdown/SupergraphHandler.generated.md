
* `source` (type: `String`, required) - A file path to your Supergraph Schema
If you provide a path to a code file(js or ts),
other options will be ignored and the schema exported from the file will be used directly.
* `schemaHeaders` (type: `Any`)
* `operationHeaders` (type: `Any`)
* `batch` (type: `Boolean`)
* `subgraphs` (type: `Array of Object`, required): 
  * `name` (type: `String`, required) - The name of the subgraph you want to configure
  * `endpoint` (type: `String`) - A url or file path to your remote GraphQL endpoint.
If you provide a path to a code file(js or ts),
other options will be ignored and the schema exported from the file will be used directly.
  * `operationHeaders` (type: `JSON`) - JSON object representing the Headers to add to the runtime of the API calls only for operation during runtime
  * `useGETForQueries` (type: `Boolean`) - Use HTTP GET for Query operations
  * `method` (type: `String (GET | POST)`) - HTTP method used for GraphQL operations
  * `credentials` (type: `String (omit | include)`) - Request Credentials if your environment supports it.
[See more](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials)

@default "same-origin"
  * `webSocketImpl` (type: `String`) - Path to a custom W3 Compatible WebSocket Implementation
  * `source` (type: `String`) - Path to the introspection
You can separately give schema introspection or SDL
  * `subscriptionsProtocol` (type: `String (SSE | WS | LEGACY_WS)`) - SSE - Server Sent Events
WS - New graphql-ws
LEGACY_WS - Legacy subscriptions-transport-ws
  * `subscriptionsEndpoint` (type: `String`) - URL to your endpoint serving all subscription queries for this source
  * `retry` (type: `Int`) - Retry attempts if fails
  * `timeout` (type: `Int`) - Timeout in milliseconds
  * `connectionParams` (type: `JSON`) - JSON object representing the `connectionParams` from a WebSocket connection to add to the runtime of the API calls only for operation during runtime.
More information about the WebSocket `connectionParams`:
  - When using `subscriptionsProtocol=WS` (graphql-ws): https://github.com/enisdenjo/graphql-ws/blob/master/docs/interfaces/client.ClientOptions.md#connectionparams
  - When using `subscriptionsProtocol=LEGACY_WS` (subscriptions-transport-ws): https://github.com/apollographql/subscriptions-transport-ws/blob/51270cc7dbaf09c7b9aa67368f1de58148c7d334/README.md#subscriptionclient