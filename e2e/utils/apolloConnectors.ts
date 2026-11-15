import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { fetch } from '@whatwg-node/fetch';

const execFileAsync = promisify(execFile);

export const APOLLO_ROUTER_VERSION = '2.19.0';

/**
 * Ensure an Apollo Router binary is available for e2e (download once into /tmp).
 * Mesh compose already emits a Router-ready connectors supergraph — no Rover step,
 * no Apollo-only SDL rewrite.
 */
export async function ensureApolloRouterBinary(
  version = process.env.APOLLO_ROUTER_VERSION || APOLLO_ROUTER_VERSION,
): Promise<string> {
  if (process.env.APOLLO_ROUTER_BIN) {
    return process.env.APOLLO_ROUTER_BIN;
  }
  if (process.platform !== 'linux') {
    throw new Error(
      `Apollo Router e2e downloads a Linux binary; set APOLLO_ROUTER_BIN on ${process.platform}`,
    );
  }
  const cacheDir = join(tmpdir(), `apollo-router-${version}`);
  const binPath = join(cacheDir, 'router');
  try {
    await execFileAsync(binPath, ['--version']);
    return binPath;
  } catch {
    // download
  }
  await mkdir(cacheDir, { recursive: true });
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  const url = `https://github.com/apollographql/router/releases/download/v${version}/router-v${version}-${arch}-unknown-linux-gnu.tar.gz`;
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download Apollo Router: ${res.status} ${url}`);
  }
  const tarPath = join(cacheDir, 'router.tar.gz');
  await pipeline(res.body as any, createWriteStream(tarPath));
  await execFileAsync('tar', ['-xzf', tarPath, '-C', cacheDir, '--strip-components=1']);
  await chmod(binPath, 0o755);
  await execFileAsync(binPath, ['--version']);
  return binPath;
}
