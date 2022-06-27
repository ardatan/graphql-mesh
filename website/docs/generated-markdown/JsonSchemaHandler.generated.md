
* `baseUrl` (type: `String`)
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
    * `responseSample` (type: `Any`) - Did you use Sample? Provide the respone sample path.
    * `responseTypeName` (type: `String`) - Inset any name for the type of the response body.
    * `responseByStatusCode` (type: `Any`) - You can define your response schemas by status codes;
responseByStatusCode:
  200:
    responseSchema: ./someschema.json#/somepath
  404:
    responseSample: ./error-sample.json
    responseTypeName: MyError
    * `exposeResponseMetadata` (type: `Boolean`) - Expose response details done to the upstream API
When you enable this, you will see a new field in the response type;
```graphql
type MyResponseType \{
  myFooField: String
  _response: ResponseMetadata
}

# And a new type for the response metadata object
type ResponseMetadata \{
  url: URL
  status: Int
  method: String
  headers: JSON
  body: String
}
```
    * `argTypeMap` (type: `JSON`) - Mapping the JSON Schema and define the arguments of the operation.
Example: 'argTypeMap: ID: String'
    * `path` (type: `String`, required)
    * `method` (type: `String (GET | HEAD | POST | PUT | DELETE | CONNECT | OPTIONS | TRACE | PATCH)`)
    * `headers` (type: `JSON`)
    * `binary` (type: `Boolean`) - If true, this operation cannot have requestSchema or requestSample
And the request body will be passed as binary with its mime type
unless you define an explicit Content-Type header
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
* `ignoreErrorResponses` (type: `Boolean`)
* `queryParams` (type: `Any`)