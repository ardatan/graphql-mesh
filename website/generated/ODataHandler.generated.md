
* `endpoint` (type: `String`, required) - Base URL for OData API
* `source` (type: `String`) - Custom $metadata File or URL
* `schemaHeaders` (type: `JSON`) - Headers to be used with the $metadata requests
* `operationHeaders` (type: `JSON`) - Headers to be used with the operation requests
* `batch` (type: `String (multipart | json)`) - Enable batching
* `expandNavProps` (type: `Boolean`) - Use $expand for navigation props instead of seperate HTTP requests (Default: false)