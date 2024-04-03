import childProcess from 'child_process';
import fs from 'fs/promises';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import { setTimeout } from 'timers/promises';
import { createArg, createPortArg, createSubgraphPortArg } from './args';

let leftovers: Proc[] = [];
afterAll(async () => {
  await Promise.allSettled(
    leftovers.map(proc => {
      proc.kill();
      return proc.waitForExit;
    }),
  );
  leftovers = [];
});

export interface Proc {
  getStd(o: 'out' | 'err' | 'both'): string;
  kill(code?: number): void;
  waitForExit: Promise<void>;
}

export interface Server extends Proc {
  port: number;
}

export interface Subgraph extends Server {
  name: string;
}

export interface ComposeOptions {
  target?: string;
  /**
   * Subgraphs relevant to the compose process.
   * It will supply `--<subgraph.name>_port=<subgraph.port>` arguments to the process.
   */
  subgraphs?: Subgraph[];
  /** Whether to mask the subgraph ports in the result. */
  maskSubgraphPorts?: boolean;
}

export interface Compose extends Proc {
  result: string;
}

export interface Tenv {
  fs: {
    read(path: string): Promise<string>;
    delete(path: string): Promise<void>;
  };
  serve(port?: number): Promise<Server>;
  compose(opts?: ComposeOptions): Promise<Compose>;
  /**
   * Starts a subgraph by name. Subgraphs are services that serve GraphQL.
   * The TypeScript subgraph executable must be at `subgraphs/<name>.ts`.
   * Port will be provided as an argument `--<name>_port=<port>` to the subgraph.
   */
  subgraph(name: string, port?: number): Promise<Subgraph>;
}

export function createTenv(cwd: string): Tenv {
  return {
    fs: {
      read(filePath) {
        return fs.readFile(path.join(cwd, filePath), 'utf8');
      },
      delete(filePath) {
        return fs.unlink(path.join(cwd, filePath));
      },
    },
    async serve(port = getAvailablePort()) {
      const proc = await spawn({ cwd }, 'yarn', 'mesh-serve', createPortArg(port));
      const server = { ...proc, port };
      await Promise.race([
        proc.waitForExit.then(() =>
          Promise.reject(
            new Error(`Serve exited successfully, but shouldn't have.\n${proc.getStd('both')}`),
          ),
        ),
        waitForReachable(server),
      ]);
      return server;
    },
    async compose(opts) {
      const { target, subgraphs = [], maskSubgraphPorts } = opts || {};
      const proc = await spawn(
        { cwd },
        'yarn',
        'mesh-compose',
        target && createArg('target', target),
        ...subgraphs.map(({ name, port }) => createSubgraphPortArg(name, port)),
      );
      await proc.waitForExit;
      let result = '';
      if (target) {
        result = await fs.readFile(path.join(cwd, target), 'utf-8');
      } else {
        result = proc.getStd('out');
      }

      if (maskSubgraphPorts) {
        for (const subgraph of subgraphs) {
          result = result.replaceAll(subgraph.port.toString(), `<${subgraph.name}_port>`);
        }
        if (target) {
          await fs.writeFile(path.join(cwd, target), result, 'utf8');
        }
      }

      return { ...proc, result };
    },
    async subgraph(name, port = getAvailablePort()) {
      const proc = await spawn(
        { cwd },
        // run with tsx from root workspace
        'yarn',
        'run',
        '-T',
        'tsx',
        path.join(cwd, 'subgraphs', name),
        createSubgraphPortArg(name, port),
      );
      const subgraph = { ...proc, name, port };
      await Promise.race([
        proc.waitForExit.then(() =>
          Promise.reject(
            new Error(`Subgraph exited successfully, but shouldn't have.\n${proc.getStd('both')}`),
          ),
        ),
        waitForReachable(subgraph),
      ]);
      return subgraph;
    },
  };
}

interface SpawnOptions {
  cwd: string;
}

function spawn(
  { cwd }: SpawnOptions,
  cmd: string,
  ...args: (string | number | boolean)[]
): Promise<Proc> {
  const child = childProcess.spawn(cmd, args.filter(Boolean).map(String), { cwd });

  let exit: (err: Error | null) => void;
  let stdout = '';
  let stderr = '';
  let stdboth = '';
  const proc: Proc = {
    getStd(o) {
      switch (o) {
        case 'out':
          return stdout;
        case 'err':
          return stderr;
        case 'both':
          return stdboth;
      }
    },
    kill: code => child.kill(code),
    waitForExit: new Promise(
      (resolve, reject) =>
        (exit = err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }),
    ),
  };
  leftovers.push(proc);

  child.stdout.on('data', x => {
    stdout += x.toString();
    stdboth += x.toString();
  });
  child.stderr.on('data', x => {
    // prefer relative paths for logs consistency
    const str = x.toString().replaceAll(path.resolve(__dirname, '..') + '/', '');
    stderr += str;
    stdboth += str;
  });
  child.once('exit', code => {
    leftovers = leftovers.filter(leftover => leftover !== proc);

    const err =
      code === 0 || code == null
        ? undefined
        : new Error(`Exit code ${code}\n${proc.getStd('both')}`);
    if (err) {
      child.emit('error', err);
    }

    child.stdin.destroy();
    child.stdout.destroy();
    child.stderr.destroy();
    child.removeAllListeners();

    exit(err);
  });

  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('spawn', () => resolve(proc));
  });
}

function getAvailablePort() {
  const server = createServer();
  server.listen(0);
  const { port } = server.address() as AddressInfo;
  server.close();
  return port;
}

async function waitForReachable(server: Server) {
  let retries = 0;
  for (;;) {
    try {
      await fetch(`http://0.0.0.0:${server.port}`);
      break;
    } catch (err) {
      if (++retries > 10) {
        throw new Error(`Server at port ${server.port} not reachable.\n${server.getStd('both')}`);
      }
      await setTimeout(500);
    }
  }
}
