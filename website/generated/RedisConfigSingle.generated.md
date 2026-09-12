
* `host` (type: `String`)
* `port` (type: `String`)
* `username` (type: `String`)
* `password` (type: `String`)
* `db` (type: `Int`)
* `url` (type: `String`)
* `family` (type: `String`)
* `lazyConnect` (type: `Boolean`) - Flag to indicate lazyConnect value for Redis client.

@default: true
* `iamAuth` (type: `Object`) - AWS IAM authentication for ElastiCache or MemoryDB. Requires Redis 7+ with an IAM-enabled user.
When configured, a short-lived SigV4 token is used as the Redis password and is automatically refreshed.
Requires `@smithy/signature-v4` and `@aws-sdk/credential-providers` to be installed.

@see https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth-iam.html: 
  * `region` (type: `String`, required) - AWS region where the ElastiCache or MemoryDB cluster is deployed.
  * `clusterName` (type: `String`, required) - The ElastiCache or MemoryDB cluster name (used as the host in the SigV4 presigned URL).
  * `userId` (type: `String`, required) - The IAM-enabled Redis username. Must match the ElastiCache or MemoryDB user id exactly.
  * `serviceName` (type: `String`) - The AWS service name to sign for. Use "elasticache" for ElastiCache, "memorydb" for MemoryDB.

@default: elasticache
  * `tokenExpirySeconds` (type: `Int`) - Token expiry in seconds. Maximum is 900 (15 minutes).

@default: 900