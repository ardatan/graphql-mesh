
* `source` (type: `Any`, required) - A pointer to your API source - could be a local file, remote file or url endpoint
* `sourceFormat` (type: `String (json | yaml)`) - Format of the source file
* `operationHeaders` (type: `JSON`) - JSON object representing the Headers to add to the runtime of the API calls
* `schemaHeaders` (type: `JSON`) - If you are using a remote URL endpoint to fetch your schema, you can set headers for the HTTP request to fetch your schema.
* `baseUrl` (type: `String`) - Specifies the URL on which all paths will be based on.
Overrides the server object in the OAS.
* `qs` (type: `JSON`) - JSON object representing the query search parameters to add to the API calls
* `includeHttpDetails` (type: `Boolean`) - Include HTTP Response details to the result object
* `addLimitArgument` (type: `Boolean`) - Auto-generate a 'limit' argument for all fields that return lists of objects, including ones produced by links
* `genericPayloadArgName` (type: `Boolean`) - Set argument name for mutation payload to 'requestBody'. If false, name defaults to camelCased pathname
* `selectQueryOrMutationField` (type: `Array of Object`) - Allows to explicitly override the default operation (Query or Mutation) for any OAS operation: 
  * `title` (type: `String`) - OAS Title
  * `path` (type: `String`) - Operation Path
  * `type` (type: `String (query | mutation | Query | Mutation)`) - Target Root Type for this operation
  * `method` (type: `String`) - Which method is used for this operation
* `provideErrorExtensions` (type: `Boolean`) - Overwrite automatic wrapping of errors into GraphqlErrors
* `operationIdFieldNames` (type: `Boolean`) - Field names can only be sanitized operationIds
By default, query field names are based on the return type type name and mutation field names are based on the operationId, which may be generated if it does not exist.
This option forces OpenAPI handler to only create field names based on the operationId.