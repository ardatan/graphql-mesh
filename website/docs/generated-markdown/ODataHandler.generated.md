
* `baseUrl` (type: `String`, required) - Base URL for OData API
* `metadata` (type: `String`) - Custom $metadata File or URL
* `operationHeaders` (type: `JSON`) - Headers to be used with the operation requests
* `schemaHeaders` (type: `JSON`) - Headers to be used with the $metadata requests
* `batch` (type: `String (multipart | json)`) - Enable batching
* `expandNavProps` (type: `Boolean`) - Use $expand for navigation props instead of seperate HTTP requests (Default: false)
* `customFetch` (type: `Any`) - Custom Fetch