
* `startupNodes` (type: `Array of Object`, required): 
  * `host` (type: `String`, required)
  * `port` (type: `String`, required)
  * `family` (type: `String`)
* `username` (type: `String`)
* `password` (type: `String`)
* `db` (type: `Int`)
* `lazyConnect` (type: `Boolean`) - Flag to indicate lazyConnect value for Redis client.

@default: true
* `dnsLookupAsIs` (type: `Boolean`)
* `tls` (type: `Boolean`)