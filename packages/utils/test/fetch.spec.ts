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

  it('should deduplicate the same GET requests in the same context', async () => {
    const context = {};
    const fetchFn = createDefaultMeshFetch(new LocalforageCache());
    const url = 'http://localhost:9856/somePath';
    const response = await fetchFn(url, {}, context);
    await response.text();
    const response2 = await fetchFn(url, {}, context);
    await response2.text();
    expect(reqCount).toBe(1);
  });
});
