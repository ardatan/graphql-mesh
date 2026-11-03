import { MemPubSub } from '@graphql-hive/pubsub';

describe('Hive PubSub (MemPubSub)', () => {
  it('should handle topics properly', async () => {
    const randomTopicName = Date.now().toString();
    const pubSub = new MemPubSub();
    const randomValues = new Array(10).fill(0).map(() => Date.now());

    globalThis.process?.nextTick(() => {
      for (const value of randomValues) {
        void pubSub.publish(randomTopicName, value);
      }
    });

    const collectedValues: number[] = [];
    for await (const value of pubSub.subscribe(randomTopicName)) {
      collectedValues.push(value);
      if (collectedValues.length === randomValues.length) {
        break;
      }
    }

    expect(collectedValues).toMatchObject(randomValues);
  });
});
