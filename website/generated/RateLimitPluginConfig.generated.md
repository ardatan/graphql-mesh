
* `config` (type: `Array of Object`, required): 
  * `type` (type: `String`, required) - The type name that the following field belongs to
  * `field` (type: `String`, required) - The field of the type that the rate limit is applied to
  * `max` (type: `Int`, required) - The maximum number of requests that can be made in a given time period
  * `ttl` (type: `Int`, required) - The time period in which the rate limit is applied
  * `identifier` (type: `String`, required) - The identifier expression that determines the identity of the request (e.g. `{context.req.socket.remoteAddress}`)