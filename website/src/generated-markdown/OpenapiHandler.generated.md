
* `source` (type: `String`, required) - A pointer to your API source (Support both JSON and YAML) - could be a local file, remote file or url endpoint
* `fallbackFormat` (type: `String (json | yaml | js | ts)`) - Format of the files referenced from the source file, for cases content type isn't detected automatically
* `endpoint` (type: `String`) - Specifies the URL on which all paths will be based on.
Overrides the server object in the OAS.
* `schemaHeaders` (type: `JSON`) - If you are using a remote URL endpoint to fetch your schema, you can set headers for the HTTP request to fetch your schema.
* `operationHeaders` (type: `JSON`) - JSON object representing the Headers to add to the runtime of the API calls
* `ignoreErrorResponses` (type: `Boolean`) - Responses are converted to a Union type grouping all possible responses.
Applying this will ignore all responses with status code other than 2xx, resulting in simpler response types, usualy regular object type instead of union.
Default: false
* `selectQueryOrMutationField` (type: `Array of Object`) - Allows to explicitly override the default operation (Query or Mutation) for any OAS operation: 
  * `type` (type: `String (query | mutation | Query | Mutation)`, required)
  * `fieldName` (type: `String`, required)
* `queryParams` (type: `JSON`) - JSON object representing the query search parameters to add to the API calls
* `timeout` (type: `Int`) - Timeout for the HTTP request in milliseconds