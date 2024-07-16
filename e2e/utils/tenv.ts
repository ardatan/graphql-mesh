import childProcess from 'child_process';
import fs from 'fs/promises';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import os from 'os';
import path, { isAbsolute } from 'path';
import { setTimeout } from 'timers/promises';
import Dockerode from 'dockerode';
import type { ExecutionResult } from 'graphql';
import { createArg, createPortArg, createServicePortArg } from './args';

export const retries = 120,
  interval = 500,
  timeout = retries * interval; // 1min
jest.setTimeout(timeout);

const leftovers = new Set<AsyncDisposable | string>();
afterAll(async () => {
  await Promise.allSettled(
    Array.from(leftovers.values()).map(leftover => {
      if (typeof leftover === 'string') {
        // file
        return fs.rm(leftover, { recursive: true });
      }
      // process
      return leftover[Symbol.asyncDispose]();
    }),
  ).finally(() => {
    leftovers.clear();
  });
});

const __project = path.resolve(__dirname, '..', '..') + '/';

const docker = new Dockerode();

export interface ProcOptions {
  /**
   * Pipe the logs from the spawned process to the current process.
   * Useful for debugging.
   */
  pipeLogs?: boolean;
}

export interface Proc extends AsyncDisposable {
  getStd(o: 'out' | 'err' | 'both'): string;
  getStats(): Promise<{
    // Total CPU utilization (of all cores) as a percentage.
    cpu: number;
    // Memory consumption in megabytes (MB).
    mem: number;
  }>;
}

export interface Server extends Proc {
  port: number;
}

export interface ServeOptions extends ProcOptions {
  port?: number;
  supergraph?: string;
}

export interface Serve extends Server {
  execute(args: {
    query: string;
    variables?: Record<string, unknown>;
    operationName?: string;
  }): Promise<ExecutionResult<any>>;
}

export interface ServiceOptions extends ProcOptions {
  /**
   * Custom port of this service.
   *
   * @default getAvailablePort()
   */
  port?: number;
  /**
   * Custom port of the serve instance.
   * Is set to the `--port` argument (available under `Args.getPort()`).
   */
  servePort?: number;
}

export interface Service extends Server {
  name: string;
}

export interface ComposeOptions extends ProcOptions {
  /**
   * Write the compose output/result to a temporary unique file with the extension.
   * The file will be deleted after the tests complete.
   */
  output?: 'graphql' | 'json' | 'js' | 'ts';
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
   * The path to the composed file.
   * If output was not specified in the options, an empty string will be provided.
   */
  output: string;
  result: string;
}

/** A map of image names to build bake targets. */
export const CONTAINER_IMAGE_TARGETS = {
  'ghcr.io/ardatan/mesh-serve': 'mesh-serve',
} as const;

export interface ContainerOptions extends ProcOptions {
  /**
   * Name of the service.
   * Note that the actual Docker container will have a unique suffix.
   */
  name: string;
  /**
   * Name of the image to pull.
   *
   * When supplying one of the {@link CONTAINER_IMAGE_TARGETS}, the relevant
   * project in the repo will be built with the context set its directory.
   */
  image: string | keyof typeof CONTAINER_IMAGE_TARGETS;
  /**
   * Port that the container uses.
   * Will be bound to an available port on the host in {@link Container.port}.
   */
  containerPort: number;
  /** A map of environment variable names to values. */
  env?: Record<string, string | number>;
  /**
   * The healtcheck test command to run on the container.
   * If provided, the run function will wait for the container to become healthy.
   */
  healthcheck: string[];
  /** Volume bindings for the container relative to the cwd of Tenv. */
  volumes?: { host: string; container: string }[];
}

export interface Container extends Service {
  /** Host port binding to the {@link ContainerOptions.containerPort}. */
  port: number;
}

export interface Tenv {
  fs: {
    read(path: string): Promise<string>;
    delete(path: string): Promise<void>;
    tempfile(name: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
  };
  spawn(command: string, opts?: ProcOptions): Promise<[proc: Proc, waitForExit: Promise<void>]>;
  serve(opts?: ServeOptions): Promise<Serve>;
  compose(opts?: ComposeOptions): Promise<Compose>;
  /**
   * Starts a service by name. Services are services that serve data, not necessarily GraphQL.
   * The TypeScript service executable must be at `services/<name>.ts` or `services/<name>/index.ts`.
   * Port will be provided as an argument `--<name>_port=<port>` to the service.
   */
  service(name: string, opts?: ServiceOptions): Promise<Service>;
  container(opts: ContainerOptions): Promise<Container>;
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
      async tempfile(name) {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'graphql-mesh_e2e_fs'));
        leftovers.add(tempDir);
        return path.join(tempDir, name);
      },
      write(filePath, content) {
        return fs.writeFile(filePath, content, 'utf-8');
      },
    },
    spawn(command, opts) {
      const [cmd, ...args] = command.split(' ');
      return spawn({ ...opts, cwd }, cmd, ...args);
    },
    async serve(opts) {
      const { port = await getAvailablePort(), supergraph, pipeLogs } = opts || {};
      const [proc, waitForExit] = await spawn(
        { cwd, pipeLogs },
        'node',
        '--import',
        'tsx',
        path.resolve(__project, 'packages', 'serve-cli', 'src', 'bin.ts'),
        createPortArg(port),
        supergraph && createArg('supergraph', supergraph),
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
        waitForExit
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
      const { services = [], trimHostPaths, maskServicePorts, pipeLogs } = opts || {};
      let output = '';
      if (opts?.output) {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'graphql-mesh_e2e_compose'));
        leftovers.add(tempDir);
        output = path.join(tempDir, `${Math.random().toString(32).slice(2)}.${opts.output}`);
      }
      const [proc, waitForExit] = await spawn(
        { cwd, pipeLogs },
        'node',
        '--import',
        'tsx',
        path.resolve(__project, 'packages', 'compose-cli', 'src', 'bin.ts'),
        output && createArg('output', output),
        ...services.map(({ name, port }) => createServicePortArg(name, port)),
      );
      await waitForExit;
      let result = '';
      if (output) {
        try {
          result = await fs.readFile(output, 'utf-8');
        } catch (err) {
          if ('code' in err && err.code === 'ENOENT') {
            throw new Error(
              `Compose command has "output" argument but file was not created at ${output}`,
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
        if (output) {
          await fs.writeFile(output, result, 'utf8');
        }
      }

      return { ...proc, output, result };
    },
    async service(name, { port, servePort, pipeLogs } = {}) {
      port ||= await getAvailablePort();
      const [proc, waitForExit] = await spawn(
        { cwd, pipeLogs },
        'node',
        '--import',
        'tsx',
        path.join(cwd, 'services', name),
        createServicePortArg(name, port),
        servePort && createPortArg(servePort),
      );
      const service: Service = { ...proc, name, port };
      const ctrl = new AbortController();
      await Promise.race([
        waitForExit
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
    async container({ name, image, env = {}, containerPort, healthcheck, pipeLogs, volumes = [] }) {
      const uniqueName = `${name}_${Math.random().toString(32).slice(2)}`;

      const hostPort = await getAvailablePort();

      function msToNs(ms: number): number {
        return ms * 1000000;
      }

      const target = CONTAINER_IMAGE_TARGETS[image];
      if (target) {
        // build bake target

        // prefer building just for the os arch instead of multi-platform builds
        const [archProc, waitForArch] = await spawn(
          { cwd: __project, shell: true, pipeLogs },
          'docker',
          'system',
          'info',
          '--format="{{.OSType}}/{{.Architecture}}"',
        );
        await waitForArch;
        const arch = archProc.getStd('out').trim();

        // TODO: dockerode does not support BuildKit which we use for building and caching
        const [, waitForBake] = await spawn(
          { cwd: __project, shell: true, env: { VERSION: 'e2e' }, pipeLogs },
          'docker',
          'buildx',
          'bake',
          `--set="*.platform=${arch}"`,
          '--load',
          target,
        );
        await waitForBake;
      } else {
        // pull image and wait for finish
        const imageStream = await docker.pull(image);
        await new Promise((resolve, reject) => {
          docker.modem.followProgress(
            imageStream,
            (err, res) => (err ? reject(err) : resolve(res)),
            pipeLogs
              ? ({ stream }) => {
                  if (stream) {
                    process.stderr.write(String(stream));
                  }
                }
              : undefined,
          );
        });
      }

      const ctr = await docker.createContainer({
        name: uniqueName,
        Image: target ? `${image}:e2e` : image,
        Env: Object.entries(env).map(([name, value]) => `${name}=${value}`),
        ExposedPorts: {
          [containerPort + '/tcp']: {},
        },
        HostConfig: {
          AutoRemove: true,
          PortBindings: {
            [containerPort + '/tcp']: [{ HostPort: hostPort.toString() }],
          },
          Binds: Object.values(volumes).map(
            ({ host, container }) => `${path.resolve(cwd, host)}:${container}`,
          ),
        },
        Healthcheck: {
          Test: healthcheck,
          Interval: msToNs(interval),
          Timeout: 0, // dont wait between tests
          Retries: retries,
        },
      });

      let stdboth = '';
      const stream = await ctr.attach({ stream: true, stdout: true, stderr: true });
      stream.on('data', data => {
        stdboth += data.toString();
        if (pipeLogs) {
          process.stderr.write(data);
        }
      });

      await ctr.start();

      const ctrl = new AbortController();
      const container: Container = {
        name,
        port: hostPort,
        getStd() {
          // TODO: distinguish stdout and stderr
          return stdboth;
        },
        getStats() {
          throw new Error('Cannot get stats of a container.');
        },
        async [Symbol.asyncDispose]() {
          if (ctrl.signal.aborted) {
            // noop if already disposed
            return;
          }
          ctrl.abort();
          await ctr.stop({ t: 0 });
        },
      };
      leftovers.add(container);

      // verify that the container has started
      await setTimeout(interval);
      try {
        await ctr.inspect();
      } catch (err) {
        if (Object(err).statusCode === 404) {
          throw new DockerError('Container was not started', container);
        }
        throw err;
      }

      // wait for healthy
      for (;;) {
        let status = '';
        try {
          const {
            State: { Health },
          } = await ctr.inspect({ abortSignal: ctrl.signal });
          status = Health?.Status ? String(Health?.Status) : '';
        } catch (err) {
          if (Object(err).statusCode === 404) {
            throw new DockerError('Container was not started', container);
          }
          throw err;
        }

        if (status === 'none') {
          await container[Symbol.asyncDispose]();
          throw new DockerError(
            'Container has "none" health status, but has a healthcheck',
            container,
          );
        } else if (status === 'unhealthy') {
          await container[Symbol.asyncDispose]();
          throw new DockerError('Container is unhealthy', container);
        } else if (status === 'healthy') {
          break;
        } else if (status === 'starting') {
          // no need to track retries, jest will time out aborting the signal
          ctrl.signal.throwIfAborted();
          await setTimeout(interval);
        } else {
          throw new DockerError(`Unknown health status "${status}"`, container);
        }
      }

      return container;
    },
  };
}

interface SpawnOptions extends ProcOptions {
  cwd: string;
  env?: Record<string, string>;
  shell?: boolean;
}

function spawn(
  { cwd, pipeLogs, env, shell }: SpawnOptions,
  cmd: string,
  ...args: (string | number | boolean)[]
): Promise<[proc: Proc, waitForExit: Promise<void>]> {
  const child = childProcess.spawn(cmd, args.filter(Boolean).map(String), {
    cwd,
    // ignore stdin, pipe stdout and stderr
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
    shell,
  });

  let exit: (err: Error | null) => void;
  const waitForExit = new Promise<void>(
    (resolve, reject) =>
      (exit = err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }),
  );
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
    async getStats() {
      const [proc, waitForExit] = await spawn(
        { cwd, pipeLogs: false },
        'ps',
        '-o',
        'pcpu=,rss=',
        '-p',
        child.pid!,
      );
      await waitForExit;
      const [cpu, mem] = proc.getStd('out').trim().split(/\s+/);
      return {
        cpu: parseFloat(cpu),
        mem: parseFloat(mem) * 0.001, // KB to MB
      };
    },
    [Symbol.asyncDispose]: () => (child.kill(), waitForExit),
  };
  leftovers.add(proc);

  child.stdout.on('data', x => {
    stdout += x.toString();
    stdboth += x.toString();
    if (pipeLogs) {
      process.stdout.write(x);
    }
  });
  child.stderr.on('data', x => {
    // prefer relative paths for logs consistency
    const str = x.toString().replaceAll(__project, '');
    stderr += str;
    stdboth += str;
    if (pipeLogs) {
      process.stderr.write(x);
    }
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
    child.once('spawn', () => resolve([proc, waitForExit]));
  });
}

export function getAvailablePort(): Promise<number> {
  const server = createServer();
  server.listen(0);
  const { port } = server.address() as AddressInfo;
  return new Promise((resolve, reject) => server.close(err => (err ? reject(err) : resolve(port))));
}

async function waitForReachable(server: Server, signal: AbortSignal) {
  for (;;) {
    try {
      await fetch(`http://0.0.0.0:${server.port}`, { signal });
      break;
    } catch (err) {
      // no need to track retries, jest will time out aborting the signal
      signal.throwIfAborted();
      await setTimeout(interval);
    }
  }
}

class DockerError extends Error {
  constructor(
    public message: string,
    container: Container,
  ) {
    super();
    this.name = 'DockerError';
    this.message = message + '\n' + container.getStd('both');
  }
}
