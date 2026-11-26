import { defineConfig, NATSPubSub } from '@graphql-hive/gateway';
import { connect } from '@nats-io/transport-node';

export const gatewayConfig = defineConfig({
  maskedErrors: false,
  pubsub: new NATSPubSub(
    await connect({
      servers: [`nats://${process.env['NATS_HOST']}:${process.env['NATS_PORT']}`],
    }),
    {
      // we make sure to use the same prefix for all gateways to share the same channels and pubsub.
      // meaning, all gateways using this channel prefix will receive and publish to the same topics
      subjectPrefix: 'my-shared-gateways',
    },
  ),
});
