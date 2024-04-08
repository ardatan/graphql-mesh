import childProcess from 'child_process';
import fs from 'fs/promises';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import os from 'os';
import path, { isAbsolute } from 'path';
import { setTimeout } from 'timers/promises';
import { ExecutionResult } from 'graphql';
import { createArg, createPortArg, createServicePortArg } from './args';

// increase timeout to get more room for reachability waits
jest.setTimeout(30_000);

const leftoverProcs = new Set<Proc>();
afterAll(async () => {
  await Promise.allSettled(
    Array.from(leftoverProcs.values()).map(proc => {
      proc.kill();
      return proc.waitForExit;
    }),
  );
});

const leftoverTempDirs = new Set<string>();
afterAll(async () => {
  await Promise.all(
    Array.from(leftoverTempDirs.values()).map(dir => fs.rm(dir, { recursive: true })),
  ).finally(() => {
    leftoverTempDirs.clear();
  });
});

const __project = path.resolve(__dirname, '..', '..') + '/';

export interface Proc {
  getStd(o: 'out' | 'err' | 'both'): string;
  kill(): void;
  /** Waits for the process to exit successfuly, or throws on non-zero signal. */
  waitForExit: Promise<void>;
}

export interface Server extends Proc {
  port: number;
}

export interface ServeOptions {
  port?: number;
  fusiongraph?: string;
}

export interface Serve extends Server {
  execute(args: {
    query: string;
    variables?: Record<string, unknown>;
    operationName?: string;
  }): Promise<ExecutionResult>;
}

export interface Service extends Server {
  name: string;
}

export interface ComposeOptions {
  /**
   * Write the compose output/result to a temporary unique file with the extension.
   * The file will be deleted after the tests complete.
   */
  target?: 'graphql' | 'json' | 'js' | 'ts';
  /**
   * Services relevant to the compose process.
   * It will supply `--<service.name>_port=<service.port>` arguments to the process.
   */
  services?: Service[];
  /** Trim paths to not include the absolute host path in the result. */
  trimHostPaths?: boolean;
  /** Mask the service ports in the result. */
  maskServicePorts?: boolean;
}

export interface Compose extends Proc {
  /**
   * The path to the target composed file.
   * If target was not specified in the options, an empty string will be provided.
   */
  target: string;
  result: string;
}

export interface Tenv {
  fs: {
    read(path: string): Promise<string>;
    delete(path: string): Promise<void>;
  };
  serve(opts?: ServeOptions): Promise<Serve>;
  compose(opts?: ComposeOptions): Promise<Compose>;
  /**
   * Starts a service by name. Services are services that serve data, not necessarily GraphQL.
   * The TypeScript service executable must be at `services/<name>.ts` or `services/<name>/index.ts`.
   * Port will be provided as an argument `--<name>_port=<port>` to the service.
   */
  service(name: string, port?: number): Promise<Service>;
}

export function createTenv(cwd: string): Tenv {
  return {
    fs: {
      read(filePath) {
        return fs.readFile(isAbsolute(filePath) ? filePath : path.join(cwd, filePath), 'utf8');
      },
      delete(filePath) {
        return fs.unlink(isAbsolute(filePath) ? filePath : path.join(cwd, filePath));
      },
    },
    async serve(opts) {
      const { port = getAvailablePort(), fusiongraph } = opts || {};
      const proc = await spawn(
        { cwd },
        'node',
        '--import',
        'tsx',
        path.resolve(__dirname, '..', '..', 'packages', 'serve-cli', 'src', 'bin.ts'),
        createPortArg(port),
        fusiongraph && createArg('fusiongraph', fusiongraph),
      );
      const serve: Serve = {
        ...proc,
        port,
        async execute(args) {
          const res = await fetch(`http://0.0.0.0:${port}/graphql`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              accept: 'application/graphql-response+json, application/json',
            },
            body: JSON.stringify(args),
          });
          if (!res.ok) {
            const err = new Error(`${res.status} ${res.statusText}\n${await res.text()}`);
            err.name = 'ResponseError';
            throw err;
          }
          return await res.json();
        },
      };
      const ctrl = new AbortController();
      await Promise.race([
        proc.waitForExit
          .then(() =>
            Promise.reject(
              new Error(`Serve exited successfully, but shouldn't have\n${proc.getStd('both')}`),
            ),
          )
          // stop reachability wait after exit
          .finally(() => ctrl.abort()),
        waitForReachable(serve, ctrl.signal),
      ]);
      return serve;
    },
    async compose(opts) {
      const { services = [], trimHostPaths, maskServicePorts } = opts || {};
      let target = '';
      if (opts?.target) {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'graphql-mesh_e2e_compose'));
        leftoverTempDirs.add(tempDir);
        target = path.join(tempDir, `${Math.random().toString(32).slice(2)}.${opts.target}`);
      }
      const proc = await spawn(
        { cwd },
        'node',
        '--import',
        'tsx',
        path.resolve(__dirname, '..', '..', 'packages', 'compose-cli', 'src', 'bin.ts'),
        target && createArg('target', target),
        ...services.map(({ name, port }) => createServicePortArg(name, port)),
      );
      await proc.waitForExit;
      let result = '';
      if (target) {
        try {
          result = await fs.readFile(target, 'utf-8');
        } catch (err) {
          if ('code' in err && err.code === 'ENOENT') {
            throw new Error(
              `Compose command has "target" argument but file was not created at ${target}`,
            );
          }
          throw err;
        }
      } else {
        result = proc.getStd('out');
      }

      if (trimHostPaths || maskServicePorts) {
        if (trimHostPaths) {
          result = result.replaceAll(__project, '');
        }
        for (const subgraph of services) {
          if (maskServicePorts) {
            result = result.replaceAll(subgraph.port.toString(), `<${subgraph.name}_port>`);
          }
        }
        if (target) {
          await fs.writeFile(target, result, 'utf8');
        }
      }

      return { ...proc, target, result };
    },
    async service(name, port = getAvailablePort()) {
      const proc = await spawn(
        { cwd },
        'node',
        '--import',
        'tsx',
        path.join(cwd, 'services', name),
        createServicePortArg(name, port),
      );
      const service: Service = { ...proc, name, port };
      const ctrl = new AbortController();
      await Promise.race([
        proc.waitForExit
          .then(() =>
            Promise.reject(
              new Error(`Service exited successfully, but shouldn't have\n${proc.getStd('both')}`),
            ),
          )
          // stop reachability wait after exit
          .finally(() => ctrl.abort()),
        waitForReachable(service, ctrl.signal),
      ]);
      return service;
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
  const child = childProcess.spawn(cmd, args.filter(Boolean).map(String), {
    cwd,
    // ignore stdin, pipe stdout and stderr
    stdio: ['ignore', 'pipe', 'pipe'],
  });

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
    kill: () => child.kill(),
    waitForExit: new Promise(
      (resolve, reject) =>
        (exit = err => {
          leftoverProcs.delete(proc);
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }),
    ),
  };
  leftoverProcs.add(proc);

  child.stdout.on('data', x => {
    stdout += x.toString();
    stdboth += x.toString();
  });
  child.stderr.on('data', x => {
    // prefer relative paths for logs consistency
    const str = x.toString().replaceAll(__project, '');
    stderr += str;
    stdboth += str;
  });

  child.once('exit', () => {
    // process ended
    child.stdout.destroy();
    child.stderr.destroy();
  });
  child.once('close', code => {
    // process ended _and_ the stdio streams have been closed
    exit(code ? new Error(`Exit code ${code}\n${proc.getStd('both')}`) : null);
  });

  return new Promise((resolve, reject) => {
    child.once('error', err => {
      exit(err); // reject waitForExit promise
      reject(err);
    });
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

async function waitForReachable(server: Server, signal: AbortSignal) {
  let retries = 0;
  for (;;) {
    try {
      await fetch(`http://0.0.0.0:${server.port}`, { signal });
      break;
    } catch (err) {
      signal.throwIfAborted();
      if (++retries > 10) {
        throw new Error(`Server at port ${server.port} not reachable\n${server.getStd('both')}`);
      }
      await setTimeout(500);
    }
  }
}
