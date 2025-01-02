
* `source` (type: `String`, required) - A url to your WSDL or generated SDL with annotations
* `schemaHeaders` (type: `Any`) - JSON object representing the Headers to add to the runtime of the API calls only for schema introspection
You can also provide `.js` or `.ts` file path that exports schemaHeaders as an object
* `operationHeaders` (type: `JSON`) - JSON object representing the Headers to add to the runtime of the API calls only for operation during runtime
* `bodyAlias` (type: `String`) - The name of the lias to be used in the envelope for body components

default: `body`
* `soapHeaders` (type: `Object`) - SOAP Headers to be added to the request: 
  * `alias` (type: `String`) - The name of the alias to be used in the envelope

default: `header`
  * `namespace` (type: `String`, required) - The namespace of the SOAP Header
For example: `http://www.example.com/namespace`
  * `headers` (type: `JSON`, required) - The content of the SOAP Header
For example: { "key": "value" } then the content will be `<key>value</key>`