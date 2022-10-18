
* `resolveUser` -  (required) One of: 
  * `String`
  * `object`: 
    * `sourceName` (type: `String`, required)
    * `sourceTypeName` (type: `String`, required)
    * `sourceFieldName` (type: `String`, required)
    * `sourceSelectionSet` (type: `String`)
    * `requiredSelectionSet` (type: `String`)
    * `sourceArgs` (type: `JSON`)
    * `targetTypeName` (type: `String`, required)
    * `targetFieldName` (type: `String`, required)
    * `result` (type: `String`) - Extract specific property from the result
    * `resultType` (type: `String`) - If return types don't match,
you can specify a result type to apply inline fragment
  * `object`: 
    * `sourceName` (type: `String`, required)
    * `sourceTypeName` (type: `String`, required)
    * `sourceFieldName` (type: `String`, required)
    * `sourceSelectionSet` (type: `String`)
    * `requiredSelectionSet` (type: `String`)
    * `keyField` (type: `String`, required)
    * `keysArg` (type: `String`, required)
    * `additionalArgs` (type: `JSON`)
    * `targetTypeName` (type: `String`, required)
    * `targetFieldName` (type: `String`, required)
    * `result` (type: `String`) - Extract specific property from the result
    * `resultType` (type: `String`) - If return types don't match,
you can specify a result type to apply inline fragment
* `contextFieldName` (type: `String`)
* `mode` (type: `String (protectAll | protectGranular | resolveOnly)`)
* `directiveOrExtensionFieldName` (type: `String`)