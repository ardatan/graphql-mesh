
* `types` (type: `Array of Object`, required): 
  * `name` (type: `String`, required)
  * `config` (type: `Object`): 
    * `key` (type: `String`)
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
        * `args` (type: `JSON`) - You need configure the arguments for that field;
```yml
args:
  someArg: "{root.someKeyValue}"
```