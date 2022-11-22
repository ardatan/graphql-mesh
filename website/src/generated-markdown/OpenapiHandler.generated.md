
* `source` (type: `String`, required) - A pointer to your API source (Support both JSON and YAML) - could be a local file, remote file or url endpoint
* `fallbackFormat` (type: `String (json | yaml | js | ts)`) - Format of the files referenced from the source file, for cases content type isn't detected automatically
* `baseUrl` (type: `String`) - Specifies the URL on which all paths will be based on.
Overrides the server object in the OAS.
* `schemaHeaders` (type: `JSON`) - If you are using a remote URL endpoint to fetch your schema, you can set headers for the HTTP request to fetch your schema.
* `operationHeaders` -  - JSON object representing the Headers to add to the runtime of the API calls One of: 
  * `JSON`
  * `String`
* `ignoreErrorResponses` (type: `Boolean`) - Responses are converted to a Union type grouping all possible responses.
Applying this will ignore all responses with status code other than 2xx, resulting in simpler response types, usualy regular object type instead of union.
Default: false
* `selectQueryOrMutationField` (type: `Array of Object`) - Allows to explicitly override the default operation (Query or Mutation) for any OAS operation: 
  * `type` (type: `String (query | mutation | Query | Mutation)`, required)
  * `fieldName` (type: `String`, required)
* `queryParams` (type: `JSON`) - JSON object representing the query search parameters to add to the API calls
* `queryStringOptions` (type: `Object`): 
  * `indices` (type: `Boolean`) - When arrays are stringified, by default they are not given explicit indices:
`a=b&a=c&a=d`
You may override this by setting the indices option to true:
`a[0]=b&a[1]=c&a[2]=d`
  * `arrayFormat` (type: `String (indices | brackets | repeat | comma)`) - You can configure how to format arrays in the query strings.

Note: when using arrayFormat set to 'comma', you can also pass the commaRoundTrip option set to true or false, to append [] on single-item arrays, so that they can round trip through a parse.
  * `commaRoundTrip` (type: `Boolean`) - Even if there is a single item in an array, this option treats them as arrays
(default: false)