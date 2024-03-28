/* eslint-disable import/no-extraneous-dependencies */

import LocalforageCache from '@graphql-mesh/cache-localforage';
import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';
import type { MeshInstance } from '@graphql-mesh/runtime';
import { defaultImportFn, DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { TestAgent } from '@newrelic/test-utilities';
import { getTestMesh } from '../../../legacy/testing/getTestMesh.mjs';
import useMeshNewRelic from '../src/index.js';

describe('New Relic', () => {
  let mesh: MeshInstance;
  let helper: any;
  let httpHandler: MeshHTTPHandler;
  beforeAll(async () => {
    const logger = new DefaultLogger('New Relic Test');
    const cache = new LocalforageCache();
    const pubsub = new PubSub();
    const baseDir = __dirname;
    helper = TestAgent.makeInstrumented();
    mesh = await getTestMesh({
      logger,
      cache,
      pubsub,
      additionalEnvelopPlugins: [
        useMeshNewRelic(
          {
            logger,
            cache,
            pubsub,
            baseDir,
            importFn: defaultImportFn,
          },
          {
            instrumentationApi: helper.getShim(),
            agentApi: helper.getAgentApi(),
          },
        ),
      ],
    });
    httpHandler = createMeshHTTPHandler({
      baseDir,
      getBuiltMesh: async () => mesh,
    });
  });
  afterAll(async () => {
    mesh.destroy();
    return helper.unload();
  });
  it('should work', async () => {
    const response = await httpHandler.fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Test {
            greetings
          }
        `,
      }),
    });
    const result = await response.json();
    expect(result).toEqual({
      data: {
        greetings: 'This is the `greetings` field of the root `Query` type',
      },
    });
  });
});
