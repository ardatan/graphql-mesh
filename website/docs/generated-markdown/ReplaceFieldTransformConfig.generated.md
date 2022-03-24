
* `typeDefs` (type: `Any`) - Additional type definition to used to replace field types
* `replacements` (type: `Array of Object`, required) - Array of rules to replace fields: 
  * `from` (type: `Object`, required): 
    * `type` (type: `String`, required)
    * `field` (type: `String`, required)
  * `to` (type: `Object`, required): 
    * `type` (type: `String`, required)
    * `field` (type: `String`, required)
  * `scope` (type: `String (config | hoistValue)`)
  * `composer` (type: `Any`)
  * `name` (type: `String`)