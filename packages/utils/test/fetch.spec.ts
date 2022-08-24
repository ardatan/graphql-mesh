// eslint-disable-next-line import/no-extraneous-dependencies
import LocalforageCache from '@graphql-mesh/cache-localforage';
import { createDefaultMeshFetch } from '../src/fetch';
// eslint-disable-next-line import/no-nodejs-modules
import http from 'http';

describe('MeshFetch', () => {
  let server: http.Server;

  let reqCount: number;

  beforeAll(done => {
    server = http.createServer((req, res) => {
      reqCount++;
      res.writeHead(200, {
        'Content-Type': 'application/json',
      });
      res.end(
        JSON.stringify({
          data: {
            hello: 'world',
          },
        })
      );
    });
    server.listen(9856, done);
  });

  beforeEach(() => {
    reqCount = 0;
  });

  afterAll(() => {
    server.close();
  });

  it('should deduplicate the same GET requests in the same context sequentially', async () => {
    const context = {};
    const fetchFn = createDefaultMeshFetch(new LocalforageCache());
    const url = 'http://localhost:9856/somePath';
    const response = await fetchFn(
      url,
      {
        headers: {
          Accept: 'application/json',
        },
      },
      context
    );
    await response.text();
    const response2 = await fetchFn(
      url,
      {
        headers: {
          Accept: 'application/json',
        },
      },
      context
    );
    await response2.text();
    expect(reqCount).toBe(1);
  });
  it('should deduplicate the same GET request in the same context in parallel', async () => {
    const context = {};
    const fetchFn = createDefaultMeshFetch(new LocalforageCache());
    const url = 'http://localhost:9856/somePath';
    const [response, response2] = await Promise.all([
      fetchFn(
        url,
        {
          headers: {
            Accept: 'application/json',
          },
        },
        context
      ),
      fetchFn(
        url,
        {
          headers: {
            Accept: 'application/json',
          },
        },
        context
      ),
    ]);
    await Promise.all([response.text(), response2.text()]);
    expect(reqCount).toBe(1);
  });
  it('should not deduplicate the different GET requests in the same context sent sequentially', async () => {
    const context = {};
    const fetchFn = createDefaultMeshFetch(new LocalforageCache());
    const url = 'http://localhost:9856/somePath';
    const response = await fetchFn(
      url,
      {
        headers: {
          Accept: 'application/json',
        },
      },
      context
    );
    await response.text();
    const response2 = await fetchFn(
      url + '2',
      {
        headers: {
          Accept: 'application/json',
        },
      },
      context
    );
    await response2.text();
    expect(reqCount).toBe(2);
  });
  it('should not deduplicate the different GET requests in the same context sent in parallel', async () => {
    const context = {};
    const fetchFn = createDefaultMeshFetch(new LocalforageCache());
    const url = 'http://localhost:9856/somePath';
    const [response, response2] = await Promise.all([
      fetchFn(
        url,
        {
          headers: {
            Accept: 'application/json',
          },
        },
        context
      ),
      fetchFn(
        url + '2',
        {
          headers: {
            Accept: 'application/json',
          },
        },
        context
      ),
    ]);
    await Promise.all([response.text(), response2.text()]);
    expect(reqCount).toBe(2);
  });
  it('should not deduplicate the same GET request in different contexts sent sequentially', async () => {
    const context = {};
    const context2 = {};
    const fetchFn = createDefaultMeshFetch(new LocalforageCache());
    const url = 'http://localhost:9856/somePath';
    const response = await fetchFn(
      url,
      {
        headers: {
          Accept: 'application/json',
        },
      },
      context
    );
    await response.text();
    const response2 = await fetchFn(
      url,
      {
        headers: {
          Accept: 'application/json',
        },
      },
      context2
    );
    await response2.text();
    expect(reqCount).toBe(2);
  });
  it('should not deduplicate the same GET request in different contexts sent in parallel', async () => {
    const context = {};
    const context2 = {};
    const fetchFn = createDefaultMeshFetch(new LocalforageCache());
    const url = 'http://localhost:9856/somePath';
    const [response, response2] = await Promise.all([
      fetchFn(
        url,
        {
          headers: {
            Accept: 'application/json',
          },
        },
        context
      ),
      fetchFn(
        url,
        {
          headers: {
            Accept: 'application/json',
          },
        },
        context2
      ),
    ]);
    await Promise.all([response.text(), response2.text()]);
    expect(reqCount).toBe(2);
  });
});
