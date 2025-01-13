
* `host` (type: `String`)
* `port` (type: `String`)
* `username` (type: `String`)
* `password` (type: `String`)
* `db` (type: `Int`)
* `url` (type: `String`)
* `lazyConnect` (type: `Boolean`) - Flag to indicate lazyConnect value for Redis client.

@default: true
* `name` (type: `String`) - identifies a group of Redis instances composed of a master and one or more slaves
* `sentinelPassword` (type: `String`) - (optional) password for Sentinel instances.
* `sentinels` (type: `Array of Object`) - A list of sentinels to connect to. The list does not need to enumerate all your sentinel instances, but a few so that if one is down the client will try the next one.: 
  * `host` (type: `String`)
  * `port` (type: `String`)
* `role` (type: `String`) - (optional) with a value of slave will return a random slave from the Sentinel group.
* `preferredSlavbe` (type: `String`) - (optional) can be used to prefer a particular slave or set of slaves based on priority. It accepts a function or array.
* `enableTLSForSentinelMode` (type: `Boolean`) - (optional) set to true if connecting to sentinel instances that are encrypted