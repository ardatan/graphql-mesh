import { readFile } from 'fs/promises';
import { join } from 'path';
import { ExecutionResult } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { createMeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh } from '@graphql-mesh/runtime';
import { createApp } from '../api/app';

describe('OpenAPI Subscriptions', () => {
  if (process.versions.node.startsWith('14')) {
    it('dummy', () => {});
    return;
  }
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
    meshHandler = createMeshHTTPHandler({
      baseDir: join(__dirname, '..'),
      getBuiltMesh: () =>
        getMesh({
          ...config,
          fetchFn: appWrapper.app.fetch as any,
        }),
      rawServeConfig: config.config.serve,
    });
    appWrapper = createApp(meshHandler.fetch as any);
  });
  afterAll(() => {
    appWrapper.dispose();
  });
  it('should work', async () => {
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

    const startWebhookResult = (await startWebhookResponse.json()) as ExecutionResult;

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

    const listenWebhookResult = listenWebhookResponse.body!;

    const iterator: AsyncIterator<Uint8Array> = listenWebhookResult[Symbol.asyncIterator]();

    const readerResult = await iterator.next();
    const chunkStr = Buffer.from(readerResult.value!).toString('utf8');
    expect(chunkStr.trim()).toBe(
      `data: ${JSON.stringify({
        data: {
          onData: {
            userData: 'RANDOM_DATA',
          },
        },
      })}`,
    );

    await iterator.return?.();
  });
});
