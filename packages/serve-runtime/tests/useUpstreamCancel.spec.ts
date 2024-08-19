/* eslint-disable import/no-extraneous-dependencies */
import { createSchema, createYoga } from 'graphql-yoga';
import { fetch } from '@whatwg-node/fetch';
import { createServerAdapter, Response } from '@whatwg-node/server';
import { createDisposableServer } from '../../testing/createDisposableServer';
import { createServeRuntime } from '../src/createServeRuntime';
import { useUpstreamCancel } from '../src/plugins/useUpstreamCancel';

describe('useUpstreamCancel', () => {
  it('cancels upstream requests when the client cancels', async () => {
    const serveRuntimeFetchCallAbortCtrl = new AbortController();
    let resolveDataSource: (response: Response) => void;
    const abortSpyOnDataSource = jest.fn(() => {
      resolveDataSource(new Response('Bye!'));
    });
    const dataSourceFetchSpy = jest.fn((res: Response) => res.text());
    const dataSourceAdapter = createServerAdapter(req => {
      serveRuntimeFetchCallAbortCtrl.abort();
      req.signal.addEventListener('abort', abortSpyOnDataSource);
      return new Promise(resolve => {
        resolveDataSource = resolve;
      });
    });
    await using dataSourceServer = await createDisposableServer(dataSourceAdapter);
    const upstreamGraphQL = createYoga({
      logging: false,
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        resolvers: {
          Query: {
            hello: (_root, _args, context) =>
              fetch(`http://localhost:${dataSourceServer.address().port}`, {
                signal: context.request.signal,
              }).then(dataSourceFetchSpy),
          },
        },
      }),
    });
    await using upstreamGraphQLServer = await createDisposableServer(upstreamGraphQL);
    await using serveRuntime = createServeRuntime({
      proxy: {
        endpoint: `http://localhost:${upstreamGraphQLServer.address().port}/graphql`,
      },
      plugins: () => [useUpstreamCancel()],
      logging: false,
    });
    await using serveRuntimeServer = await createDisposableServer(serveRuntime);
    const res$ = fetch(`http://localhost:${serveRuntimeServer.address().port}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            hello
          }
        `,
      }),
      signal: serveRuntimeFetchCallAbortCtrl.signal,
    });
    await expect(res$).rejects.toThrow();
    expect(dataSourceFetchSpy).not.toHaveBeenCalled();
    await new Promise<void>(resolve => setTimeout(resolve, 300));
    expect(abortSpyOnDataSource).toHaveBeenCalled();
  });
});
