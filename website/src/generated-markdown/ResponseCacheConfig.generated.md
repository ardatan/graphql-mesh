
* `ttl` (type: `Float`) - Maximum age in ms. Defaults to `Infinity`. Set it to 0 for disabling the global TTL.
* `ttlPerCoordinate` (type: `Array of Object`) - Overwrite the ttl for query operations whose selection contains a specific schema coordinate (e.g. Query.users).
Useful if the selection of a specific field should reduce the TTL of the query operation.: 
  * `coordinate` (type: `String`, required)
  * `ttl` (type: `Float`, required)
* `ignoredTypes` (type: `Array of String`) - Skip caching of following the types.
* `idFields` (type: `Array of String`) - List of fields that are used to identify the entity.
* `invalidateViaMutation` (type: `Boolean`) - Whether the mutation execution result should be used for invalidating resources.
Defaults to `true`
* `includeExtensionMetadata` (type: `Boolean`) - Include extension values that provide useful information, such as whether the cache was hit or which resources a mutation invalidated.
* `sessionId` (type: `String`) - Allows to cache responses based on the resolved session id.
Return a unique value for each session.
Creates a global session by default.
Example;
```yaml
sessionId: "{context.headers.userId}"
```
* `if` (type: `String`) - Specify whether the cache should be used based on the context.
```yaml
if: "context.headers.userId != null"
```
* `cacheKey` (type: `String`) - Customize the behavior how the response cache key is computed from the documentString, variableValues, contextValue and sessionId.
If the given string is interpolated as empty, default behavior is used.
Example;
```yaml
# Cache by specific value
cacheKey: "{variableValues.userId}"

# Cache by documentString
cacheKey: "{documentString}"

# Cache by operationName
cacheKey: "{operationName}"

# Cache by some header value
cacheKey: "{contextValue.headers.authorization}"

# Or combine two of each
cacheKey: "{contextValue.headers.authorization}-{operationName}"
```
* `shouldCacheResult` (type: `String`) - Checks if the result should be cached.
```yaml
shouldCacheResult: "result.errors.length > 0"
```