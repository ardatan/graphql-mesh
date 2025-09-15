import { Redis } from 'ioredis';
import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import { RedisPubSub } from '@graphql-hive/pubsub/redis';
import { toMeshPubSub } from '@graphql-mesh/types';

/**
 * When a Redis connection enters "subscriber mode" (after calling SUBSCRIBE), it can only execute
 * subscriber commands (SUBSCRIBE, UNSUBSCRIBE, etc.). Meaning, it cannot execute other commands like PUBLISH.
 * To avoid this, we use two separate Redis clients: one for publishing and one for subscribing.
 */
const pub = new Redis({
  host: process.env['REDIS_HOST'],
  port: parseInt(process.env['REDIS_PORT']!),
  autoResubscribe: true,
});
const sub = new Redis({
  host: process.env['REDIS_HOST'],
  port: parseInt(process.env['REDIS_PORT']!),
  autoResubscribe: true,
});

export const gatewayConfig = defineGatewayConfig({
  pubsub: new RedisPubSub(
    { pub, sub },
    {
      channelPrefix: 'gw',
    },
  ),
});
