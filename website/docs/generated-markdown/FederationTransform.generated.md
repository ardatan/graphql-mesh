
* `types` (type: `Array of Object`, required): 
  * `name` (type: `String`, required)
  * `config` (type: `Object`): 
    * `keyFields` (type: `Array of String`, required)
    * `extend` (type: `Boolean`)
    * `fields` (type: `Array of Object`, required): 
      * `name` (type: `String`, required)
      * `config` (type: `Object`, required): 
        * `external` (type: `Boolean`)
        * `provides` (type: `String`)
        * `requires` (type: `String`)
    * `resolveReference` -  One of: 
      * `String`
      * `object`: 
        * `queryFieldName` (type: `String`, required) - Name of root field name that resolves the reference
        * `keyArg` (type: `String`) - If the root field name has multiple args,
you need to define which argument should receive the key