
* `types` (type: `Array of Object`, required): 
  * `name` (type: `String`, required)
  * `config` (type: `Object`): 
    * `key` (type: `Array of Object`): 
      * `fields` (type: `String`)
    * `shareable` (type: `Boolean`)
    * `extends` (type: `Boolean`)
    * `fields` (type: `Array of Object`, required): 
      * `name` (type: `String`, required)
      * `config` (type: `Object`, required): 
        * `external` (type: `Boolean`)
        * `provides` (type: `Object`): 
          * `fields` (type: `String`)
        * `requires` (type: `Object`): 
          * `fields` (type: `String`)
        * `tag` (type: `Object`): 
          * `name` (type: `String`)
        * `inaccessible` (type: `Boolean`)
        * `override` (type: `Object`): 
          * `from` (type: `String`)
    * `resolveReference` -  One of: 
      * `String`
      * `object`: 
        * `queryFieldName` (type: `String`, required) - Name of root field name that resolves the reference
        * `args` (type: `JSON`) - You need configure the arguments for that field;
```yaml
args:
  someArg: "{root.someKeyValue}"
```