
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
  * `includeDefaults` (type: `Boolean`) - Flag to indicate whether certain default types (built-ins, scalars and other types specified an exclusion list) should be renamed or not.

@default: false