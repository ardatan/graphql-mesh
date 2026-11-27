import { execFile } from 'node:child_process';
import { access, chmod, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fetch } from '@whatwg-node/fetch';

const execFileAsync = promisify(execFile);

/** Rover release used when downloading a Linux binary for e2e. */
export const APOLLO_ROVER_VERSION = '1.1.0';

/**
 * Ensure an Apollo Rover binary is available (env override, PATH, or download).
 */
export async function ensureApolloRoverBinary(
  version = process.env.APOLLO_ROVER_VERSION || APOLLO_ROVER_VERSION,
): Promise<string> {
  if (process.env.APOLLO_ROVER_BIN) {
    return process.env.APOLLO_ROVER_BIN;
  }
  try {
    await execFileAsync('rover', ['--version']);
    return 'rover';
  } catch {
    // fall through
  }
  // Prefer a prior local npm install (dev / cloud agent scratch).
  const localNpmBin = join(tmpdir(), 'apollo-rover-cli/node_modules/.bin/rover');
  try {
    await execFileAsync(localNpmBin, ['--version']);
    return localNpmBin;
  } catch {
    // fall through
  }
  if (process.platform !== 'linux') {
    throw new Error(
      `Apollo Rover e2e downloads a Linux binary; set APOLLO_ROVER_BIN on ${process.platform}`,
    );
  }
  const cacheDir = join(tmpdir(), `apollo-rover-${version}`);
  const binPath = join(cacheDir, 'rover');
  try {
    await execFileAsync(binPath, ['--version']);
    return binPath;
  } catch {
    // download
  }
  await mkdir(cacheDir, { recursive: true });
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  const url = `https://github.com/apollographql/rover/releases/download/v${version}/rover-v${version}-${arch}-unknown-linux-gnu.tar.gz`;
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download Apollo Rover: ${res.status} ${url}`);
  }
  const tarPath = join(cacheDir, 'rover.tar.gz');
  const { createWriteStream } = await import('node:fs');
  const { pipeline } = await import('node:stream/promises');
  await pipeline(res.body as any, createWriteStream(tarPath));
  await execFileAsync('tar', ['-xzf', tarPath, '-C', cacheDir]);
  let resolved = binPath;
  try {
    await access(resolved);
  } catch {
    resolved = join(cacheDir, 'dist', 'rover');
  }
  await chmod(resolved, 0o755);
  await execFileAsync(resolved, ['--version']);
  return resolved;
}

export interface RoverSubgraphInput {
  name: string;
  routingUrl: string;
  /** Absolute path to Federation-facing subgraph SDL (no Mesh-only directives). */
  schemaFile: string;
}

/**
 * Compose a supergraph with Apollo Rover from local subgraph SDL files.
 * Returns the path to the written supergraph SDL.
 */
export async function composeSupergraphWithRover(opts: {
  subgraphs: RoverSubgraphInput[];
  /** Directory for supergraph.yaml + output (created if missing). */
  workDir: string;
  federationVersion?: string;
}): Promise<{ supergraphPath: string; sdl: string }> {
  const rover = await ensureApolloRoverBinary();
  const federationVersion = opts.federationVersion || '=2.9.0';
  const configPath = join(opts.workDir, 'supergraph.yaml');
  const supergraphPath = join(opts.workDir, 'supergraph.graphql');

  const lines = [`federation_version: '${federationVersion}'`, 'subgraphs:'];
  for (const sg of opts.subgraphs) {
    lines.push(`  ${sg.name}:`);
    lines.push(`    routing_url: ${sg.routingUrl}`);
    lines.push(`    schema:`);
    lines.push(`      file: ${sg.schemaFile}`);
  }
  await writeFile(configPath, lines.join('\n') + '\n', 'utf8');

  let stdout = '';
  let stderr = '';
  try {
    const result = await execFileAsync(
      rover,
      [
        'supergraph',
        'compose',
        '--config',
        configPath,
        '--output',
        supergraphPath,
        '--elv2-license',
        'accept',
      ],
      {
        env: {
          ...process.env,
          APOLLO_ELV2_LICENSE: 'accept',
          APOLLO_ROVER_ALLOW_AUTOMATIC_DOWNLOAD: '1',
        },
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err: any) {
    throw new Error(
      `rover supergraph compose failed:\n${err?.stderr || stderr}\n${err?.stdout || stdout}\n${err}`,
    );
  }
  if (!(await fileExists(supergraphPath))) {
    throw new Error(`rover did not write ${supergraphPath}:\n${stderr}\n${stdout}`);
  }
  const { readFile } = await import('node:fs/promises');
  const sdl = await readFile(supergraphPath, 'utf8');
  return { supergraphPath, sdl };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
