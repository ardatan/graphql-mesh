
* `source` (type: `String`, required) - A url to your WSDL or generated SDL with annotations
* `schemaHeaders` (type: `Any`) - JSON object representing the Headers to add to the runtime of the API calls only for schema introspection
You can also provide `.js` or `.ts` file path that exports schemaHeaders as an object
* `operationHeaders` (type: `JSON`) - JSON object representing the Headers to add to the runtime of the API calls only for operation during runtime