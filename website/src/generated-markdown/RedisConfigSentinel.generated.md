
* `name` (type: `String`, required) - identifies a group of Redis instances composed of a master and one or more slaves
* `sentinelPassword` (type: `String`) - (optional) password for Sentinel instances.
* `sentinels` (type: `Array of Object`, required) - A list of sentinels to connect to. The list does not need to enumerate all your sentinel instances, but a few so that if one is down the client will try the next one.: 
  * `host` (type: `String`, required)
  * `port` (type: `String`, required)
  * `family` (type: `String`)
* `role` (type: `String (master | slave)`) - (optional) with a value of slave will return a random slave from the Sentinel group.
* `enableTLSForSentinelMode` (type: `Boolean`) - (optional) set to true if connecting to sentinel instances that are encrypted
* `lazyConnect` (type: `Boolean`) - Flag to indicate lazyConnect value for Redis client.

@default: true