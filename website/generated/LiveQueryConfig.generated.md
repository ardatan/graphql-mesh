
* `invalidations` (type: `Array of Object`) - Invalidate a query or queries when a specific operation is done without an error: 
  * `field` (type: `String`) - Path to the operation that could effect it. In a form: Mutation.something. Note that wildcard is not supported in this field.
  * `pollingInterval` (type: `Int`) - Polling interval in milliseconds
  * `invalidate` (type: `Array of String`, required)
* `resourceIdentifier` (type: `String`) - Custom strategy for building resources identifiers
By default resource identifiers are built by concatenating the Typename with the id separated by a color (`User:1`).

This may be useful if you are using a relay compliant schema and the Typename information is not required for building a unique topic.

Default: "{typename}:{id}"
* `includeIdentifierExtension` (type: `Boolean`) - Whether the extensions should include a list of all resource identifiers for the latest operation result.
Any of those can be used for invalidating and re-scheduling the operation execution.

This is mainly useful for discovering and learning what kind of topics a given query will subscribe to.
The default value is `true` if `DEBUG` environment variable is set
* `idFieldName` (type: `String`) - Identifier unique field

Default: "id"
* `indexBy` (type: `Array of Object`) - Specify which fields should be indexed for specific invalidations.: 
  * `field` (type: `String`, required)
  * `args` (type: `Array of String`, required)