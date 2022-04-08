
* `baseUrl` (type: `String`)
* `operationHeaders` (type: `JSON`)
* `schemaHeaders` (type: `JSON`)
* `operations` -  (required) Array of: 
  * `object`: 
    * `field` (type: `String`, required)
    * `description` (type: `String`)
    * `type` (type: `String (Query | Mutation | Subscription)`, required)
    * `requestSchema` (type: `Any`)
    * `requestSample` (type: `Any`)
    * `requestTypeName` (type: `String`)
    * `requestBaseBody` (type: `Any`) - This body will be merged with the request body sent with the underlying HTTP request
    * `responseSchema` (type: `Any`)
    * `responseSample` (type: `Any`)
    * `responseTypeName` (type: `String`)
    * `responseByStatusCode` (type: `Any`) - You can define your response schemas by status codes;

responseByStatusCode:
  200:
    responseSchema: ./someschema.json#/somepath
  404:
    responseSample: ./error-sample.json
    responseTypeName: MyError
    * `argTypeMap` (type: `JSON`)
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
    * `requestBaseBody` (type: `Any`) - This body will be merged with the request body sent with the underlying HTTP request
    * `responseSchema` (type: `Any`)
    * `responseSample` (type: `Any`)
    * `responseTypeName` (type: `String`)
    * `argTypeMap` (type: `JSON`)
    * `pubsubTopic` (type: `String`, required)
* `ignoreErrorResponses` (type: `Boolean`)