import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream, openSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { fetch } from '@whatwg-node/fetch';

const execFileAsync = promisify(execFile);

const ROUTER_VERSION = '2.19.0';
const FIXTURES = join(__dirname, 'fixtures');

/**
 * Dual-runtime smoke: Mesh emits `connect/v0.4` SDL; Apollo Router must execute it
 * against a real REST upstream. Uses a checked-in Rover-composed supergraph fixture
 * (federation ≥ 2.14.1) so CI does not need Rover.
 */
describe('Apollo Router Connectors smoke', () => {
  let upstream: ReturnType<typeof createServer> | undefined;
  let router: ChildProcess | undefined;
  let workDir: string | undefined;
  let routerUrl: string | undefined;

  afterAll(async () => {
    router?.kill('SIGTERM');
    await new Promise<void>(resolve => {
      if (!upstream) {
        resolve();
        return;
      }
      upstream.close(() => resolve());
    });
  });

  it('executes Mesh-compatible @connect SDL on Apollo Router', async () => {
    workDir = await mkdtemp(join(tmpdir(), 'apollo-connectors-smoke-'));
    const upstreamPort = await startUpstream();
    const routerBin = await ensureRouterBinary(workDir);
    const configPath = join(workDir, 'router.yaml');
    const configTemplate = await readFile(join(__dirname, 'router.yaml'), 'utf8');
    await writeFile(
      configPath,
      configTemplate.replace('PLACEHOLDER_UPSTREAM_PORT', String(upstreamPort)),
    );

    const listenPort = await getFreePort();
    // Router config listen:0 is unsupported on some builds — pin an ephemeral port.
    await writeFile(
      configPath,
      (await readFile(configPath, 'utf8')).replace(
        'listen: 127.0.0.1:0',
        `listen: 127.0.0.1:${listenPort}`,
      ),
    );

    const logPath = join(workDir, 'router.log');
    const logFd = openSync(logPath, 'w');
    router = spawn(
      routerBin,
      ['--supergraph', join(FIXTURES, 'supergraph.graphql'), '--config', configPath],
      { stdio: ['ignore', logFd, logFd] },
    );
    routerUrl = `http://127.0.0.1:${listenPort}/`;
    await waitForRouter(routerUrl, logPath);

    const res = await fetch(routerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ hello { message } }' }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      data: { hello: { message: 'world' } },
    });
  }, 120_000);

  async function startUpstream(): Promise<number> {
    return await new Promise((resolve, reject) => {
      upstream = createServer((req, res) => {
        if (req.url === '/hello') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ message: 'world' }));
          return;
        }
        res.writeHead(404);
        res.end();
      });
      upstream.once('error', reject);
      upstream.listen(0, '127.0.0.1', () => {
        const addr = upstream!.address();
        if (!addr || typeof addr === 'string') {
          reject(new Error('unexpected upstream address'));
          return;
        }
        resolve(addr.port);
      });
    });
  }
});

async function getFreePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address();
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()));
  });
  if (!addr || typeof addr === 'string') {
    throw new Error('could not allocate free port');
  }
  return addr.port;
}

async function waitForRouter(url: string, logPath: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      if (res.ok || res.status === 400) {
        return;
      }
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 250));
  }
  const logs = await readFile(logPath, 'utf8').catch(() => '');
  throw new Error(`Apollo Router did not become ready\n${logs}`);
}

async function ensureRouterBinary(workDir: string): Promise<string> {
  if (process.env.APOLLO_ROUTER_BIN) {
    return process.env.APOLLO_ROUTER_BIN;
  }
  const cacheDir = join(tmpdir(), `apollo-router-${ROUTER_VERSION}`);
  const binPath = join(cacheDir, 'router');
  try {
    await execFileAsync(binPath, ['--version']);
    return binPath;
  } catch {
    // download below
  }

  await mkdir(cacheDir, { recursive: true });
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  if (process.platform !== 'linux') {
    throw new Error(
      `Apollo Router smoke downloads a Linux binary; set APOLLO_ROUTER_BIN on ${process.platform}`,
    );
  }
  const url = `https://github.com/apollographql/router/releases/download/v${ROUTER_VERSION}/router-v${ROUTER_VERSION}-${arch}-unknown-linux-gnu.tar.gz`;
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download Apollo Router: ${res.status} ${url}`);
  }
  const tarPath = join(workDir, 'router.tar.gz');
  await pipeline(res.body as any, createWriteStream(tarPath));
  // Prefer system tar for gzip+ustar from GitHub releases.
  await execFileAsync('tar', ['-xzf', tarPath, '-C', cacheDir, '--strip-components=1']);
  await chmod(binPath, 0o755);
  await execFileAsync(binPath, ['--version']);
  return binPath;
}
