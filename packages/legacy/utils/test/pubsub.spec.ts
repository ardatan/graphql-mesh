import { PubSub } from '../src/pubsub.js';

describe('Mesh PubSub', () => {
  it('should handle topics properly', async () => {
    const randomTopicName = Date.now().toString();
    const pubSub = new PubSub();
    const randomValues = new Array(10).fill(0).map(() => Date.now());

    process.nextTick(() => {
      for (const value of randomValues) {
        pubSub.publish(randomTopicName, value);
      }
    });

    const collectedValues: number[] = [];
    for await (const value of pubSub.asyncIterator(randomTopicName)) {
      collectedValues.push(value);
      if (collectedValues.length === randomValues.length) {
        break;
      }
    }

    expect(collectedValues).toMatchObject(randomValues);
  });
});
