
* `types` (type: `Array of Object`, required): 
  * `typeName` (type: `String`) - Name of the type (Query by default)
  * `key` (type: `Object`) - Specifies a base selection set needed to merge the annotated type across subschemas.
Analogous to the `selectionSet` setting specified in [merged type configuration](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example).: 
    * `selectionSet` (type: `String`, required)
  * `canonical` (type: `Boolean`) - Specifies types and fields
that provide a [canonical definition](https://www.graphql-tools.com/docs/stitch-type-merging#canonical-definitions) to be built into the gateway schema. Useful for selecting preferred characteristics among types and fields that overlap across subschemas. Root fields marked as canonical specify which subschema the field proxies for new queries entering the graph.
  * `fields` (type: `Array of Object`, required): 
    * `fieldName` (type: `String`, required)
    * `computed` (type: `Object`) - specifies a selection of fields required from other services to compute the value of this field.
These additional fields are only selected when the computed field is requested.
Analogous to [computed field](https://www.graphql-tools.com/docs/stitch-type-merging#computed-fields) in merged type configuration.
Computed field dependencies must be sent into the subservice using an [object key](https://www.graphql-tools.com/docs/stitch-directives-sdl#object-keys).: 
      * `selectionSet` (type: `String`, required)
* `queryFields` (type: `Array of Object`, required) - Denotes a root field used to query a merged type across services.
The marked field's name is analogous
to the fieldName setting in
[merged type configuration](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example),
while the field's arguments and return type are used to infer merge configuration.
Directive arguments tune the merge behavior: 
  * `queryFieldName` (type: `String`, required)
  * `keyField` (type: `String`) - Specifies the name of a field to pick off origin objects as the key value. When omitted, a `@key` directive must be included on the return type's definition to be built into an object key.
https://www.graphql-tools.com/docs/stitch-directives-sdl#object-keys
  * `keyArg` (type: `String`) - Specifies which field argument receives the merge key. This may be omitted for fields with only one argument where the recipient can be inferred.
  * `additionalArgs` (type: `String`) - Specifies a string of additional keys and values to apply to other arguments,
formatted as `\"\"\" arg1: "value", arg2: "value" \"\"\"`.
  * `key` (type: `Array of String`, required) - Advanced use only; Allows building a custom key just for the argument from the selectionSet included by the `@key` directive.
  * `argsExpr` (type: `String`) - Advanced use only; This argument specifies a string expression that allows more customization of the input arguments. Rules for evaluation of this argument are as follows:
  - basic object parsing of the input key: `"arg1: $key.arg1, arg2: $key.arg2"`
  - any expression enclosed by double brackets will be evaluated once for each of the requested keys, and then sent as a list: `"input: \{ keys: [[$key]] }"`
  - selections from the key can be referenced by using the $ sign and dot notation: `"upcs: [[$key.upc]]"`, so that `$key.upc` refers to the `upc` field of the key.
* `additionalConfiguration` (type: `Any`) - The path to a code file that has additional type merging configuration