
* `startupNodes` (type: `Array of Object`, required): 
  * `host` (type: `String`, required)
  * `port` (type: `String`, required)
  * `family` (type: `String`)
* `username` (type: `String`)
* `password` (type: `String`)
* `db` (type: `Int`)
* `lazyConnect` (type: `Boolean`) - Flag to indicate lazyConnect value for Redis client.

@default: true
* `dnsLookupAsIs` (type: `Boolean`) - Needed for TLS connections to Redis Cluster (especially when using AWS Elasticache Clusters with TLS).

@see https://github.com/redis/ioredis?tab=readme-ov-file#special-note-aws-elasticache-clusters-with-tls
* `tls` (type: `Boolean`) - Enable TLS for Redis Cluster connections. Required for AWS Elasticache Clusters with TLS.

@see https://github.com/redis/ioredis?tab=readme-ov-file#special-note-aws-elasticache-clusters-with-tls