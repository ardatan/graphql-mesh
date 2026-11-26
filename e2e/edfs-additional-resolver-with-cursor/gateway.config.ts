import { defineConfig, NATSJetStreamPubSub } from '@graphql-hive/gateway';
import { jetstream } from '@nats-io/jetstream';
import { connect } from '@nats-io/transport-node';
import { mapAsyncIterator } from '@whatwg-node/promise-helpers';

export const gatewayConfig = defineConfig({
  maskedErrors: false,
  pubsub: new NATSJetStreamPubSub(
    jetstream(
      await connect({
        servers: [`nats://${process.env['NATS_HOST']}:${process.env['NATS_PORT']}`],
      }),
    ),
    {
      subjectPrefix: 'edfs-additional-resolver-with-cursor',
      stream: process.env['NATS_STREAM'] || 'REVIEWS',
    },
  ),
  additionalTypeDefs: /* GraphQL */ `
    extend schema {
      subscription: Subscription
    }

    type Subscription {
      reviewCreated(after: String): ReviewCreated!
    }

    type ReviewCreated {
      review: Review!
      cursor: String
    }
  `,
  additionalResolvers: {
    Subscription: {
      reviewCreated: {
        subscribe(_root: unknown, { after }: { after?: string | null }, context: any) {
          return mapAsyncIterator(
            context.pubsub.subscribe('review_created', {
              cursor: after ?? undefined,
            }),
            ({ data: review, cursor }: { data: unknown; cursor: string }) => ({
              reviewCreated: { review, cursor },
            }),
          );
        },
      },
    },
  },
});
