import { setTimeout } from 'node:timers/promises';
import { createClient } from 'graphql-sse';
import { createTenv } from '@e2e/tenv';
import { jetstream, jetstreamManager } from '@nats-io/jetstream';
import { connect } from '@nats-io/transport-node';
import { fetch } from '@whatwg-node/fetch';

const { container, serve, service, composeWithApollo } = createTenv(__dirname);

const SUBJECT_PREFIX = 'edfs-additional-resolver-with-cursor';
const STREAM_NAME = 'REVIEWS';

const natsEnv = {
  NATS_HOST: '',
  NATS_PORT: 0,
  NATS_STREAM: STREAM_NAME,
};

let nc: Awaited<ReturnType<typeof connect>>;
let js: ReturnType<typeof jetstream>;

beforeAll(async () => {
  const nats = await container({
    name: 'nats',
    image: 'nats:2.11-alpine', // we want alpine for healtcheck
    containerPort: 4222,
    args: ['-js', '-m', '8222'], // enable jetstream
    healthcheck: ['CMD-SHELL', 'wget --spider http://localhost:8222/healthz'],
  });
  natsEnv.NATS_HOST = '0.0.0.0';
  natsEnv.NATS_PORT = nats.port;

  nc = await connect({ servers: [`0.0.0.0:${nats.port}`] });
  const jsm = await jetstreamManager(nc);
  // the stream must exist and cover the topic's subject before subscribing
  await jsm.streams.add({
    name: STREAM_NAME,
    subjects: [`${SUBJECT_PREFIX}:review_created`],
  });
  js = jetstream(nc);
});

afterAll(async () => {
  await nc?.close();
});

function publishReviewCreated(id: string) {
  return js.publish(`${SUBJECT_PREFIX}:review_created`, JSON.stringify({ id }));
}

it('replays missed events from the cursor of the last received one', async () => {
  const products = await service('products');
  const reviews = await service('reviews');
  const { output } = await composeWithApollo({ services: [products, reviews] });
  const gw = await serve({ supergraph: output, env: natsEnv });

  const client = createClient({
    url: `http://0.0.0.0:${gw.port}/graphql`,
    fetchFn: fetch,
    retryAttempts: 0,
  });

  const query = /* GraphQL */ `
    subscription OnReviewCreated($after: String) {
      reviewCreated(after: $after) {
        review {
          id
          content
          product {
            name
          }
        }
        cursor
      }
    }
  `;

  // start a subscription with no cursor, it should only receive new events
  const sub1 = client.iterate({ query, variables: { after: null } });
  const firstMsg = (async () => {
    for await (const msg of sub1) {
      return msg;
    }
    throw new Error('subscription ended without a message');
  })();

  // give the subscription time to establish its consumer before publishing
  await setTimeout(300);
  await publishReviewCreated('1');

  const first: any = await firstMsg;
  expect(first.data.reviewCreated.review).toEqual({
    id: '1',
    content: 'Great desk!',
    product: { name: 'Desk' },
  });
  const cursor1 = first.data.reviewCreated.cursor;
  expect(typeof cursor1).toBe('string');

  // publish another event while no subscription is active, it must not be lost
  await publishReviewCreated('2');

  // start a new subscription resuming from the first response's cursor
  const sub2 = client.iterate({ query, variables: { after: cursor1 } });
  const second: any = await (async () => {
    for await (const msg of sub2) {
      return msg;
    }
    throw new Error('subscription ended without a message');
  })();

  expect(second.data.reviewCreated.review).toEqual({
    id: '2',
    content: 'Sturdy legs.',
    product: { name: 'Desk' },
  });
  const cursor2 = second.data.reviewCreated.cursor;
  expect(cursor2).not.toBe(cursor1);
  expect(Number(cursor2)).toBeGreaterThan(Number(cursor1));
});
