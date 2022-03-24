
* `typeName` (type: `String`, required) - Type name that defines where field should be hoisted to
* `pathConfig` -  - Array of fieldsNames to reach the field to be hoisted (required) Array of: 
  * `String`
  * `object`: 
    * `fieldName` (type: `String`, required) - Field name
    * `filterArgs` (type: `Array of String`, required) - Match fields based on argument, needs to implement `(arg: GraphQLArgument) => boolean`;
* `newFieldName` (type: `String`, required) - Name the hoisted field should have when hoisted to the type specified in typeName
* `alias` (type: `String`)
* `filterArgsInPath` (type: `Boolean`) - Defines if args in path are filtered (default = false)