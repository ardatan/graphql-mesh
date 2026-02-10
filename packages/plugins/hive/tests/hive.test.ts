import { setTimeout } from 'node:timers/promises';
import { createMeshHTTPHandler } from '@graphql-mesh/http';
import { DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { Response } from '@whatwg-node/fetch';
import { createDeferredPromise, fakePromise } from '@whatwg-node/promise-helpers';
import { getTestMesh } from '../../../legacy/testing/getTestMesh';
import useMeshHive from '../src';

describe('Hive', () => {
  it('does not hook into Node.js process', () => {
    const spy = jest.spyOn(process, 'once');
    const plugin = useMeshHive({
      enabled: true,
      token: 'FAKE_TOKEN',
    });
    plugin.onPluginInit?.({
      addPlugin: jest.fn(),
      plugins: [],
      setSchema: jest.fn(),
      registerContextErrorHandler: jest.fn(),
    });
    expect(spy).not.toHaveBeenCalled();
    // @ts-expect-error - ignore
    return plugin.onDispose();
  });
  it('does not leak when mesh instance is disposed', async () => {
    const pubsub = new PubSub();
    const logger = new DefaultLogger();
    const reportDeferred = createDeferredPromise();
    await using mesh = await getTestMesh({
      pubsub,
      logger,
      additionalEnvelopPlugins: [
        useMeshHive({
          enabled: true,
          token: 'FAKE_TOKEN',
          pubsub,
          logger,
          agent: {
            fetch(url, init) {
              reportDeferred.resolve();
              return fakePromise(Response.json({ url, init }));
            },
          },
        }),
      ],
    });
    const meshHttp = createMeshHTTPHandler({
      baseDir: __dirname,
      getBuiltMesh: () => fakePromise(mesh),
    });
    const res = await meshHttp.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ greetings }',
      }),
    });
    const resJson: any = await res.json();
    expect(resJson.data.greetings).toBe('This is the `greetings` field of the root `Query` type');
    await reportDeferred.promise;
    await setTimeout(100); // wait for any pending operations to complete
  });
});
