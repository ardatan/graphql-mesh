
* `name` (type: `String`) - Optional, name to use for grouping under the root types. If not specific, the API name is used.
* `applyTo` (type: `Object`) - Allow you to choose which root operations you would like to apply. By default, it's applied to all root types.: 
  * `query` (type: `Boolean`)
  * `mutation` (type: `Boolean`)
  * `subscription` (type: `Boolean`)
* `outerTypeName` (type: `Object`) - Allows to provide the name of root types which are not the standard ones ("Query", "Mutation" and "Subscription" for query, mutation and subscription root types respectively) so they are specified as outer type name when wrapping a type (`WrapType`).: 
  * `query` (type: `String`)
  * `mutation` (type: `String`)
  * `subscription` (type: `String`)