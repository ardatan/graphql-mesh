
* `source` (type: `String`)
* `endpoint` (type: `String`)
* `operationHeaders` (type: `JSON`)
* `schemaHeaders` (type: `JSON`)
* `operations` -  (required) Array of: 
  * `object`: 
    * `field` (type: `String`, required) - This Field based on the field name of the URL path.
Example: "https://MyAPIURL.com/FieldNameHere/",
so we will set the "field: FieldNameHere".
    * `description` (type: `String`) - Your chance to describe the operation!
Make sure the description is clear and concise.
    * `type` (type: `String (Query | Mutation | Subscription)`, required) - Type field is set the opertion type: Query, Mutation or Subscription.
    * `requestSchema` (type: `Any`) - Your chance to provide request schema name.
    * `requestSample` (type: `Any`) - The path definition of the JSON Schema sample.
Example: "./jsons/questions.response.json".
    * `requestTypeName` (type: `String`) - Inset any name for the type of the request body.
    * `requestBaseBody` (type: `Any`) - This body will be merged with the request body sent with
the underlying HTTP request
    * `responseSchema` (type: `Any`) - Yay! Now you can provide the response schema name.
    * `responseSample` (type: `Any`) - Did you use Sample? Provide the response sample path.
    * `responseTypeName` (type: `String`) - Inset any name for the type of the response body.
    * `responseByStatusCode` (type: `Any`) - You can define your response schemas by status codes;
```yaml filename=".meshrc.yaml"
responseByStatusCode:
  200:
    responseSchema: ./someschema.json#/somepath
  404:
    responseSample: ./error-sample.json
    responseTypeName: MyError
```
    * `exposeResponseMetadata` (type: `Boolean`) - Expose response details done to the upstream API
When you enable this, you will see a new field in the response type;
```graphql
type MyResponseType {
  myFooField: String
  _response: ResponseMetadata
}

# And a new type for the response metadata object
type ResponseMetadata {
  url: URL
  status: Int
  method: String
  headers: JSON
  body: String
}
```
    * `argTypeMap` (type: `JSON`) - Mapping the JSON Schema and define the arguments of the operation.

# Example:
argTypeMap:
  user_id:
    type: string
    * `queryParamArgMap` (type: `JSON`) - JSON object representing the mapping of query search parameters (added to the route path) and the matching argument.

# Example:
queryParamArgMap:
  id: user_id
    * `path` (type: `String`, required)
    * `method` (type: `String (GET | HEAD | POST | PUT | DELETE | CONNECT | OPTIONS | TRACE | PATCH)`)
    * `headers` (type: `JSON`)
    * `binary` (type: `Boolean`) - If true, this operation cannot have requestSchema or requestSample
And the request body will be passed as binary with its mime type
unless you define an explicit Content-Type header
    * `deprecated` (type: `Boolean`) - If true, `@deprecated` will be added to the field definition
  * `object`: 
    * `field` (type: `String`, required)
    * `description` (type: `String`)
    * `type` (type: `String (Query | Mutation | Subscription)`, required)
    * `requestSchema` (type: `Any`)
    * `requestSample` (type: `Any`)
    * `requestTypeName` (type: `String`)
    * `requestBaseBody` (type: `Any`) - This body will be merged with the request body sent with
the underlying HTTP request
    * `responseSchema` (type: `Any`)
    * `responseSample` (type: `Any`)
    * `responseTypeName` (type: `String`)
    * `argTypeMap` (type: `JSON`)
    * `pubsubTopic` (type: `String`, required)
    * `deprecated` (type: `Boolean`) - If true, `@deprecated` will be added to the field definition
* `ignoreErrorResponses` (type: `Boolean`)
* `queryParams` (type: `Any`)
* `queryStringOptions` (type: `Object`): 
  * `indices` (type: `Boolean`) - When arrays are stringified, by default they are not given explicit indices:
`a=b&a=c&a=d`
You may override this by setting the indices option to true:
`a[0]=b&a[1]=c&a[2]=d`
  * `arrayFormat` (type: `String (indices | brackets | repeat | comma)`) - You can configure how to format arrays in the query strings.

Note: when using arrayFormat set to 'comma', you can also pass the commaRoundTrip option set to true or false, to append [] on single-item arrays, so that they can round trip through a parse.
  * `commaRoundTrip` (type: `Boolean`) - Even if there is a single item in an array, this option treats them as arrays
(default: false)
  * `jsonStringify` (type: `Boolean`) - Stringify the nested objects as JSON
(default: false)
* `timeout` (type: `Int`) - Timeout for the HTTP request in milliseconds