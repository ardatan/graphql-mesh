
* `mode` (type: `String (bare | wrap)`) - Specify to apply rename transforms to bare schema or by wrapping original schema
* `renames` (type: `Array of Object`, required) - Array of rename rules: 
  * `from` (type: `Object`, required): 
    * `type` (type: `String`)
    * `field` (type: `String`)
    * `argument` (type: `String`)
  * `to` (type: `Object`, required): 
    * `type` (type: `String`)
    * `field` (type: `String`)
    * `argument` (type: `String`)
  * `useRegExpForTypes` (type: `Boolean`) - Use Regular Expression for type names
  * `useRegExpForFields` (type: `Boolean`) - Use Regular Expression for field names
  * `useRegExpForArguments` (type: `Boolean`) - Use Regular Expression for field names
  * `regExpFlags` (type: `String`) - Flags to use in the Regular Expression