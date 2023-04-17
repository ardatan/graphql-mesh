/* eslint-disable import/no-nodejs-modules */

/* eslint-disable import/no-extraneous-dependencies */
import http from 'http';
import useMeshSerializeHeaders from '@graphql-mesh/plugin-serialize-headers';
import { wrapFetchWithPlugins } from '@graphql-mesh/runtime';
import { fetch } from '@whatwg-node/fetch';

describe('serialize-headers', () => {
  const server = http.createServer((req, res) => {
    res.end('ok');
  });
  beforeEach(done => {
    server.listen(0, done);
  });
  afterEach(done => {
    server.close(done);
  });
  it('works', async () => {
    jest.spyOn(http, 'request');
    const fetchFn = wrapFetchWithPlugins([
      {
        onFetch({ setFetchFn }) {
          setFetchFn(fetch);
        },
      },
      useMeshSerializeHeaders({
        names: ['x-FOO'],
      }),
    ]);
    const fullUrl = `http://localhost:${(server.address() as any).port}/somePath`;
    const response = await fetchFn(fullUrl, {
      headers: {
        'x-foo': 'bar',
      },
    });
    await response.text();
    expect(http.request).toHaveBeenCalledWith(
      fullUrl,
      expect.objectContaining({
        headers: {
          'x-FOO': 'bar',
        },
      }),
    );
  });
});
