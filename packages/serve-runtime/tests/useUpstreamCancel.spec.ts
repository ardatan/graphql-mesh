/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-extraneous-dependencies */
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { createSchema, createYoga } from 'graphql-yoga';
import { fetch } from '@whatwg-node/fetch';
import { createServerAdapter, Response } from '@whatwg-node/server';
import { createServeRuntime } from '../src/createServeRuntime';
import { useUpstreamCancel } from '../src/useUpstreamCancel';

describe('useUpstreamCancel', () => {
  const serversToClose = new Set<Server>();
  afterAll(() =>
    Promise.all(
      [...serversToClose].map(
        server =>
          new Promise<void>((resolve, reject) => {
            server.closeAllConnections();
            server.close(err => (err ? reject(err) : resolve()));
          }),
      ),
    ),
  );
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
    const dataSourceServer = createServer(dataSourceAdapter);
    await new Promise<void>(resolve =>
      dataSourceServer.listen(0, () => {
        serversToClose.add(dataSourceServer);
        resolve();
      }),
    );
    const upstreamGraphQL = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        resolvers: {
          Query: {
            hello: (_root, _args, context) =>
              fetch(`http://localhost:${(dataSourceServer.address() as AddressInfo).port}`, {
                signal: context.request.signal,
              }).then(dataSourceFetchSpy),
          },
        },
      }),
    });
    const upstreamGraphQLServer = createServer(upstreamGraphQL);
    await new Promise<void>(resolve =>
      upstreamGraphQLServer.listen(0, () => {
        serversToClose.add(upstreamGraphQLServer);
        resolve();
      }),
    );
    const serveRuntime = createServeRuntime({
      proxy: {
        endpoint: `http://localhost:${(upstreamGraphQLServer.address() as AddressInfo).port}/graphql`,
      },
      plugins: () => [useUpstreamCancel()],
    });
    const serveRuntimeServer = createServer(serveRuntime);
    await new Promise<void>(resolve =>
      serveRuntimeServer.listen(0, () => {
        serversToClose.add(serveRuntimeServer);
        resolve();
      }),
    );
    const res$ = fetch(
      `http://localhost:${(serveRuntimeServer.address() as AddressInfo).port}/graphql`,
      {
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
      },
    );
    await expect(res$).rejects.toThrow();
    expect(dataSourceFetchSpy).not.toHaveBeenCalled();
    await new Promise<void>(resolve => setTimeout(resolve, 300));
    expect(abortSpyOnDataSource).toHaveBeenCalled();
  });
});
