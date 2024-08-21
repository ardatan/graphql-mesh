import { PubSub } from '@graphql-mesh/utils';
import useMeshHive from '../src';

describe('Hive', () => {
  let pubsub: PubSub;
  beforeEach(() => {
    pubsub = new PubSub();
  });
  afterEach(() => {
    pubsub.publish('destroy', undefined);
  });
  it('does not hook into Node.js process', () => {
    const spy = jest.spyOn(process, 'once');
    useMeshHive({
      enabled: true,
      pubsub,
      token: 'FAKE_TOKEN',
    }).onPluginInit?.({
      addPlugin: jest.fn(),
      plugins: [],
      setSchema: jest.fn(),
      registerContextErrorHandler: jest.fn(),
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
