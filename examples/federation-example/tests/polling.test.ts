import { exec } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fetch } from '@whatwg-node/fetch';
import { createDisposableServer } from '../../../packages/testing/createDisposableServer';
import { disposableExec } from '../../../packages/testing/disposableExec';
import { getAvailablePort } from '../../../packages/testing/getAvailablePort';
import { getLocalHostName } from '../../../packages/testing/getLocalHostName';

jest.setTimeout(30000);
describe('Polling Test', () => {
  it('should pass', async () => {
    const cwd = join(__dirname, 'fixtures/polling');
    const supergraphSdlPath = join(cwd, 'supergraph.graphql');
    const supergraphSdl = readFileSync(supergraphSdlPath, 'utf-8');
    let changedSupergraph = false;
    await using supergraphSdlServer = await createDisposableServer((req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      if (process.env.DEBUG) {
        console.log('Serving supergraph SDL');
      }
      if (changedSupergraph) {
        res.end(supergraphSdl.replace('topProducts', 'topProductsNew'));
      } else {
        res.end(supergraphSdl);
      }
    });
    const SUPERGRAPH_SOURCE = `http://localhost:${(supergraphSdlServer.address() as any).port}`;
    if (process.env.DEBUG) {
      console.info('Supergraph SDL server is running on ' + SUPERGRAPH_SOURCE);
    }
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
    const port = await getAvailablePort();
    using serveCmd = disposableExec(`${join(__dirname, '../node_modules/.bin/mesh')} start`, {
      cwd,
      env: {
        ...process.env,
        PORT: port.toString(),
        SUPERGRAPH_SOURCE,
      },
    });
    await new Promise<void>(resolve => {
      serveCmd.stderr?.on('data', function stderrListener(data: string) {
        if (process.env.DEBUG) {
          console.log(data);
        }
        if (data.includes('Serving GraphQL Mesh')) {
          serveCmd.stderr?.off('data', stderrListener);
          resolve();
        }
      });
    });
    const hostname = await getLocalHostName(port);
    const url = `http://${hostname}:${port}/graphql`;
    const resp = await fetch(url, {
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
              name: 'topProducts',
            },
          ],
        },
      },
    });
    changedSupergraph = true;
    await new Promise(resolve => setTimeout(resolve, 3000));
    const resp2 = await fetch(url, {
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
              name: 'topProductsNew',
            },
          ],
        },
      },
    });
  });
});
