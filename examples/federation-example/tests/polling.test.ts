import { exec, execSync } from 'child_process';
import { createReadStream, readFile, readFileSync, write, writeFileSync } from 'fs';
import { createServer } from 'http';
import { join } from 'path';

jest.setTimeout(30000);
describe('Polling Test', () => {
  let cleanupCallbacks: (() => void)[] = [];
  afterAll(() => {
    cleanupCallbacks.forEach(cb => cb());
  });
  it('should pass', async () => {
    const cwd = join(__dirname, 'fixtures/polling');
    const supergraphSdlPath = join(cwd, 'supergraph.graphql');
    const supergraphSdl = readFileSync(supergraphSdlPath, 'utf-8');
    let changedSupergraph = false;
    const supergraphSdlServer = createServer((req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      console.log('Serving supergraph SDL');
      if (changedSupergraph) {
        res.end(supergraphSdl.replace('topProducts', 'topProductsNew'));
      } else {
        res.end(supergraphSdl);
      }
    });
    await new Promise<void>(resolve => supergraphSdlServer.listen(0, resolve));
    cleanupCallbacks.push(() => supergraphSdlServer.close());
    const SUPERGRAPH_SOURCE = `http://localhost:${(supergraphSdlServer.address() as any).port}`;
    console.info('Supergraph SDL server is running on ' + SUPERGRAPH_SOURCE);
    const buildCmd = exec(`${join(__dirname, '../node_modules/.bin/mesh')} build`, {
      cwd,
      env: {
        ...process.env,
        SUPERGRAPH_SOURCE,
      },
    });
    await new Promise<void>(resolve => {
      buildCmd.stderr?.on('data', function stderrListener(data: string) {
        if (data.includes('Done!')) {
          buildCmd.stderr?.off('data', stderrListener);
          resolve();
        }
      });
    });
    changedSupergraph = true;
    const serveCmd = exec(`${join(__dirname, '../node_modules/.bin/mesh')} start`, {
      cwd,
      env: {
        ...process.env,
        SUPERGRAPH_SOURCE,
      },
    });
    cleanupCallbacks.push(() => serveCmd.kill());
    await new Promise<void>(resolve => {
      serveCmd.stderr?.on('data', function stderrListener(data: string) {
        console.log(data);
        if (data.includes('Serving GraphQL Mesh')) {
          serveCmd.stderr?.off('data', stderrListener);
          resolve();
        }
      });
    });
    const resp = await fetch('http://127.0.0.1:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          {
            __type(name:"Query") {
              fields {
                name
              }
            }
          }
        `,
      }),
    });
    const data = await resp.json();
    expect(data).toEqual({
      data: {
        __type: {
          fields: [
            {
              name: 'me',
            },
            {
              name: 'user',
            },
            {
              name: 'users',
            },
            {
              name: 'topProductsNew',
            },
          ],
        },
      },
    });
    changedSupergraph = false;
    await new Promise(resolve => setTimeout(resolve, 3000));
    const resp2 = await fetch('http://127.0.0.1:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          {
            __type(name:"Query") {
              fields {
                name
              }
            }
          }
        `,
      }),
    });
    const data2 = await resp2.json();
    expect(data2).toEqual({
      data: {
        __type: {
          fields: [
            {
              name: 'me',
            },
            {
              name: 'user',
            },
            {
              name: 'users',
            },
            {
              name: 'topProducts',
            },
          ],
        },
      },
    });
  });
});
