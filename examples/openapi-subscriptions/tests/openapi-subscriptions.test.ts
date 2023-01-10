import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { ProcessedConfig } from '@graphql-mesh/config';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { app } from '../api/app';
import { ExecutionResult } from 'graphql';
import { createMeshHTTPHandler } from '@graphql-mesh/http';
import { createServer, Server } from 'http';
import { fetch } from '@whatwg-node/fetch';

describe('OpenAPI Subscriptions', () => {
  if (process.versions.node.startsWith('14')) {
    it('dummy', () => {});
    return;
  }
  let config: ProcessedConfig;
  let appServer: Server;
  let meshServer: Server;
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
    const httpHandler = createMeshHTTPHandler({
      baseDir: join(__dirname, '..'),
      getBuiltMesh: () => getMesh(config),
      rawServeConfig: config.config.serve,
    });
    meshServer = createServer(httpHandler);
    await new Promise<void>(resolve => meshServer.listen(4000, resolve));
    appServer = await new Promise<Server>(resolve => {
      const server = app.listen(4001, () => resolve(server));
    });
  });
  afterAll(async () => {
    app.emit('destroy');
    await new Promise<void>((resolve, reject) =>
      meshServer.close(err => (err ? reject(err) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      appServer.close(err => (err ? reject(err) : resolve())),
    );
  });
  it('should work', async () => {
    const startWebhookMutation = await readFile(
      join(__dirname, '..', 'example-queries', 'startWebhook.mutation.graphql'),
      'utf8',
    );

    const startWebhookResponse = await fetch('http://localhost:4000/graphql', {
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

    const listenWebhookResponse = await fetch('http://localhost:4000/graphql', {
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

    const reader = listenWebhookResult.getReader();

    const readerResult = await reader.read();
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

    reader.releaseLock();
    await listenWebhookResult.cancel();
  });
});
