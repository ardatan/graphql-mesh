---
'@graphql-mesh/types': minor
'@graphql-mesh/cache-redis': minor
---

AWS IAM authentication for Redis cache

IAM auth for ElastiCache/MemoryDB works by generating a short-lived SigV4 presigned URL (valid up to 15 minutes) and using it as the Redis AUTH password. The token is signed against the `elasticache` (or `memorydb`) service using the ambient AWS credentials resolved via the standard credential chain (env vars, `~/.aws/credentials`, EC2 instance role, ECS task role, etc.).

The `@smithy/signature-v4` and `@aws-sdk/credential-providers` packages are dynamically imported
only when `iamAuth` is configured, so gateways not using IAM auth pay zero cost.

## Usage

Install the optional peer dependencies:

```sh
yarn add @smithy/signature-v4 @aws-sdk/credential-providers
```

```ts
import RedisCache from '@graphql-mesh/cache-redis';

const cache = new RedisCache({
  host: 'my-cluster.abc123.0001.use1.cache.amazonaws.com',
  port: '6379',
  username: 'iam-user-01',
  tls: true,
  iamAuth: {
    // AWS region where the cluster is deployed
    region: 'us-east-1',
    // cluster name used as the host in the SigV4 presigned URL
    clusterName: 'my-cluster',
    // IAM-enabled Redis username - must match the ElastiCache/MemoryDB user id exactly
    userId: 'iam-user-01',
    // AWS service to sign for - 'elasticache' (default) or 'memorydb'
    serviceName: 'elasticache',
    // token expiry in seconds - maximum 900 (15 minutes), defaults to 900
    tokenExpirySeconds: 900,
  },
});
```

https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth-iam.html

