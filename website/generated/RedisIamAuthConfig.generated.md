AWS IAM authentication configuration for ElastiCache or MemoryDB.


* `region` (type: `String`, required) - AWS region where the ElastiCache or MemoryDB cluster is deployed.
* `clusterName` (type: `String`, required) - The ElastiCache or MemoryDB cluster name (used as the host in the SigV4 presigned URL).
* `userId` (type: `String`, required) - The IAM-enabled Redis username. Must match the ElastiCache or MemoryDB user id exactly.
* `serviceName` (type: `String`) - The AWS service name to sign for. Use "elasticache" for ElastiCache, "memorydb" for MemoryDB.

@default: elasticache
* `tokenExpirySeconds` (type: `Int`) - Token expiry in seconds. Maximum is 900 (15 minutes).

@default: 900