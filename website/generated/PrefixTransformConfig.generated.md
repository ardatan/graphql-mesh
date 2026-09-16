
* `mode` (type: `String (bare | wrap)`) - Specify to apply prefix transform to bare schema or by wrapping original schema
* `value` (type: `String`) - The prefix to apply to the schema types. By default it's the API name.
* `ignore` (type: `Array of String`, required) - List of ignored types
* `includeRootOperations` (type: `Boolean`) - Changes root types and changes the field names (default: false)
* `includeTypes` (type: `Boolean`) - Changes types (default: true)
* `force` (type: `Array of String`, required) - Protected custom scalars (e.g. from graphql-scalars) to still prefix.
GraphQL specified scalars (Int, Float, String, Boolean, ID) always stay unprefixed.