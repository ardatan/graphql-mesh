
* `field` (type: `String`, required) - The type and field to apply cache to, you can use wild cards as well, for example: `Query.*`
* `cacheKey` (type: `String`) - Cache key to use to store your resolvers responses.
The default is: `{typeName}-{fieldName}-{argsHash}-{fieldNamesHash}`

Available variables:
  - `{args.argName}` - use resolver argument
  - `{typeName}` - use name of the type
  - `{fieldName}` - use name of the field
  - `{argsHash}` - a hash based on the 'args' object
  - `{fieldNamesHash}` - a hash based on the field names selected by the client
  - `{info}` - the GraphQLResolveInfo of the resolver

Available interpolations:
  - `{format|date}` - returns the current date with a specific format
* `invalidate` (type: `Object`) - Invalidation rules: 
  * `effectingOperations` (type: `Array of Object`, required) - Invalidate the cache when a specific operation is done without an error: 
    * `operation` (type: `String`, required) - Path to the operation that could effect it. In a form: Mutation.something. Note that wildcard is not supported in this field.
    * `matchKey` (type: `String`) - Cache key to invalidate on successful resolver (no error), see `cacheKey` for list of available options in this field.
  * `ttl` (type: `Int`) - Specified in seconds, the time-to-live (TTL) value limits the lifespan