import { readFile } from 'fs/promises';
import { join } from 'path';
import { ExecutionResult } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { createMeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh } from '@graphql-mesh/runtime';
import { createApp } from '../api/app';

describe('OpenAPI Subscriptions', () => {
  let config: ProcessedConfig;
  let appWrapper: ReturnType<typeof createApp>;
  let meshHandler: ReturnType<typeof createMeshHTTPHandler>;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    config.logger = {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
      log: () => {},
      child() {
        return this;
      },
    };
    const mesh$ = getMesh({
      ...config,
      fetchFn: (...args) => appWrapper.app.fetch(...args),
    });
    meshHandler = createMeshHTTPHandler({
      baseDir: join(__dirname, '..'),
      getBuiltMesh: () => mesh$,
      rawServeConfig: config.config.serve,
    });
    // @ts-expect-error TODO: Fix fetch signature
    appWrapper = createApp(meshHandler.fetch);
  });
  afterAll(() => {
    appWrapper.dispose();
  });
  it('should work', async () => {
    expect.assertions(2);
    const startWebhookMutation = await readFile(
      join(__dirname, '..', 'example-queries', 'startWebhook.mutation.graphql'),
      'utf8',
    );

    const startWebhookResponse = await meshHandler.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: startWebhookMutation,
      }),
    });

    const startWebhookResult: ExecutionResult = await startWebhookResponse.json();

    expect(startWebhookResult).toMatchObject({
      data: {
        post_streams: {
          subscriptionId: expect.any(String),
        },
      },
    });

    const listenWebhookSubscription = await readFile(
      join(__dirname, '..', 'example-queries', 'listenWebhook.subscription.graphql'),
      'utf8',
    );

    const listenWebhookResponse = await meshHandler.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        query: listenWebhookSubscription,
        variables: {
          subscriptionId: (startWebhookResult.data?.post_streams as any).subscriptionId,
        },
      }),
    });

    if (!listenWebhookResponse.body) {
      throw new Error('No body in listenWebhookResponse');
    }

    const reader = listenWebhookResponse.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunkStr = Buffer.from(value).toString('utf8').trim();
        if (chunkStr.includes('data: ')) {
          expect(chunkStr).toContain(
            `data: ${JSON.stringify({
              data: {
                onData: {
                  userData: 'RANDOM_DATA',
                },
              },
            })}`,
          );
          break;
        }
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
  });
});
