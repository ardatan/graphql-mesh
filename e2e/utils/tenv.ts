import childProcess from 'child_process';
import fs from 'fs/promises';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import os from 'os';
import path, { isAbsolute } from 'path';
import type { Readable } from 'stream';
import { inspect } from 'util';
import Dockerode from 'dockerode';
import type { ExecutionResult } from 'graphql';
import {
  IntrospectAndCompose,
  RemoteGraphQLDataSource,
  type ServiceEndpointDefinition,
} from '@apollo/gateway';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { fetch } from '@whatwg-node/fetch';
import { getLocalHostName, localHostnames } from '../../packages/testing/getLocalHostName';
import { leftoverStack } from './leftoverStack';
import { createOpt, createPortOpt, createServicePortOpt } from './opts';
import { trimError } from './trimError';

export const retries = 120,
  interval = 500,
  timeout = retries * interval; // 1min

if (typeof jest !== 'undefined') {
  jest.setTimeout(timeout);
}

const __project = path.resolve(__dirname, '..', '..') + path.sep;

const docker = new Dockerode();

export interface ProcOptions {
  /**
   * Pipe the logs from the spawned process to the current process.
   * Useful for debugging.
   *
   * @default boolEnv('DEBUG')
   */
  pipeLogs?: boolean;
  /**
   * Additional environment variables to pass to the spawned process.
   *
   * They will be merged with `process.env` overriding any existing value.
   */
  env?: Record<string, string | number>;
  /** Extra args to pass to the process. */
  args?: (string | number | boolean)[];
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
  hostname: string;
  port: number;
}

export interface ServeOptions extends ProcOptions {
  port?: number;
  supergraph?: string;
  /** {@link serveRunner Serve runner} specific options. */
  runner?: {
    /** "docker" specific options. */
    docker?: {
      volumes?: ContainerOptions['volumes'];
    };
  };
}

export interface Serve extends Server {
  execute(args: {
    query: string;
    variables?: Record<string, unknown>;
    operationName?: string;
    headers?: Record<string, string>;
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

export interface ContainerOptions extends ProcOptions {
  /**
   * Name of the service.
   * Note that the actual Docker container name will have a unique suffix
   * and will be available at {@link Container.containerName}.
   */
  name: string;
  /**
   * Name of the image to use for the container.
   *
   * If the image name exists as a literal in any of the tags in the docker-bake.hcl
   * file, that local image baked image will be used. So dont forget to bake before
   * running the tests.
   *
   * Otherwise, the image gets pulled.
   */
  image: string;
  /**
   * Port that the container uses.
   *
   * Will be bound to the {@link hostPort}.
   */
  containerPort: number;
  /**
   * Additional ports from the container to expose.
   */
  additionalContainerPorts?: number[];
  /**
   * Port that will be bound to the {@link containerPort}.
   *
   * @default getAvailablePort()
   */
  hostPort?: number;
  /**
   * The healthcheck test command to run on the container.
   * If provided, the run function will wait for the container to become healthy.
   */
  healthcheck: string[];
  /** Docker CMD to pass to the container when running. */
  cmd?: (string | number | boolean)[];
  /** Volume bindings for the container relative to the cwd of Tenv. */
  volumes?: { host: string; container: string }[];
}

export interface Container extends Service {
  /** The name of running Docker container.  */
  containerName: string;
  /** Host port binding to the {@link ContainerOptions.containerPort}. */
  port: number;
  /** A map of {@link ContainerOptions.additionalContainerPorts additional container ports} to the ports on the host. */
  additionalPorts: Record<number, number>;
}

export interface Tenv {
  fs: {
    read(path: string): Promise<string>;
    delete(path: string): Promise<void>;
    tempfile(name: string, content?: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
  };
  spawn(
    command: string | (string | number)[],
    opts?: ProcOptions,
  ): Promise<[proc: Proc, waitForExit: Promise<void>]>;
  serve(opts?: ServeOptions): Promise<Serve>;
  compose(opts?: ComposeOptions): Promise<Compose>;
  /**
   * Starts a service by name. Services are services that serve data, not necessarily GraphQL.
   * The TypeScript service executable must be at `services/<name>.ts` or `services/<name>/index.ts`.
   * Port will be provided as an argument `--<name>_port=<port>` to the service.
   */
  service(name: string, opts?: ServiceOptions): Promise<Service>;
  container(opts: ContainerOptions): Promise<Container>;
  composeWithApollo(opts: {
    services: Service[];
    trimHostPaths?: boolean;
    maskServicePorts?: boolean;
  }): Promise<{
    output: string;
    result: string;
  }>;
}

export function createTenv(cwd: string): Tenv {
  const tenv: Tenv = {
    fs: {
      read(filePath) {
        return fs.readFile(isAbsolute(filePath) ? filePath : path.join(cwd, filePath), 'utf8');
      },
      delete(filePath) {
        return fs.unlink(isAbsolute(filePath) ? filePath : path.join(cwd, filePath));
      },
      async tempfile(name, content) {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'graphql-mesh_e2e_fs'));
        leftoverStack.defer(() => fs.rm(tempDir, { recursive: true }));
        const tempFile = path.join(tempDir, name);
        if (content) await fs.writeFile(tempFile, content, 'utf-8');
        return tempFile;
      },
      write(filePath, content) {
        return fs.writeFile(filePath, content, 'utf-8');
      },
    },
    spawn(command, { args: extraArgs = [], ...opts } = {}) {
      const [cmd, ...args] = Array.isArray(command) ? command : command.split(' ');
      return spawn({ ...opts, cwd }, String(cmd), ...args, ...extraArgs);
    },
    async serve(opts) {
      let {
        port = await getAvailablePort(),
        supergraph,
        pipeLogs = boolEnv('DEBUG'),
        env,
        args = [],
      } = opts || {};

      const [proc, waitForExit] = await spawn(
        { env, cwd, pipeLogs },
        'node', // TODO: using yarn does not work on Windows in the CI
        path.join(__project, 'node_modules', '@graphql-hive', 'gateway', 'dist', 'bin.js'),
        ...(supergraph ? ['supergraph', supergraph] : []),
        ...args,
        createPortOpt(port),
      );

      let hostName: string;

      const serve: Serve = {
        ...proc,
        port,
        get hostname() {
          return hostName;
        },
        async execute({ headers, ...args }) {
          const res = await fetch(`http://${hostName || 'localhost'}:${port}/graphql`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              accept: 'application/graphql-response+json, application/json',
              ...headers,
            },
            body: JSON.stringify(args),
          });
          if (!res.ok) {
            const err = new Error(`${res.status} ${res.statusText}\n${await res.text()}`);
            err.name = 'ResponseError';
            throw err;
          }
          const resBody: ExecutionResult = await res.json();
          if (resBody?.errors?.some(error => error.message.includes('Unexpected'))) {
            process.stderr.write(proc.getStd('both'));
          }
          return resBody;
        },
      };
      const ctrl = new AbortController();
      const hostnames = await Promise.race([
        waitForExit
          ?.then(() =>
            Promise.reject(
              new Error(`Serve exited successfully, but shouldn't have\n${proc.getStd('both')}`),
            ),
          )
          // stop reachability wait after exit
          .finally(() => ctrl.abort()),
        waitForReachable(serve, ctrl.signal),
      ]);
      hostName = hostnames?.[0];
      return serve;
    },
    async compose(opts) {
      const {
        services = [],
        trimHostPaths,
        maskServicePorts,
        pipeLogs = boolEnv('DEBUG'),
        env,
        args = [],
      } = opts || {};
      let output = '';
      if (opts?.output) {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'graphql-mesh_e2e_compose'));
        leftoverStack.defer(() => fs.rm(tempDir, { recursive: true }));
        output = path.join(tempDir, `${Math.random().toString(32).slice(2)}.${opts.output}`);
      }
      const [proc, waitForExit] = await spawn(
        { cwd, pipeLogs, env },
        'node',
        '--import',
        'tsx',
        path.resolve(__project, 'packages', 'compose-cli', 'src', 'bin.ts'),
        output && createOpt('output', output),
        ...services.map(({ name, port }) => createServicePortOpt(name, port)),
        ...args,
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
        if (maskServicePorts) {
          result = applyMaskServicePorts(result, opts.services);
        }
        if (output) {
          await fs.writeFile(output, result, 'utf8');
        }
      }

      return { ...proc, output, result };
    },
    async service(name, { port, servePort, pipeLogs = boolEnv('DEBUG'), args = [] } = {}) {
      port ||= await getAvailablePort();
      const ctrl = new AbortController();
      const [proc, waitForExit] = await spawn(
        { cwd, pipeLogs, signal: ctrl.signal },
        'node',
        '--import',
        'tsx',
        path.join(cwd, 'services', name),
        createServicePortOpt(name, port),
        servePort && createPortOpt(servePort),
        ...args,
      );
      let hostName: string;
      const service: Service = {
        ...proc,
        name,
        get hostname() {
          return hostName;
        },
        port,
      };
      const hostnames = await Promise.race([
        waitForExit
          .then(() =>
            Promise.reject(
              new Error(
                `Service "${name}" exited successfully, but shouldn't have\n${proc.getStd('both')}`,
              ),
            ),
          )
          // stop reachability wait after exit
          .finally(() => ctrl.abort()),
        waitForReachable(service, ctrl.signal),
      ]);
      hostName = hostnames?.[0];
      return service;
    },
    async container({
      name,
      image,
      env = {},
      containerPort,
      hostPort,
      additionalContainerPorts: containerAdditionalPorts,
      healthcheck,
      pipeLogs = boolEnv('DEBUG'),
      cmd = [],
      volumes = [],
      args = [],
    }) {
      const containerName = `${name}_${Math.random().toString(32).slice(2)}`;

      if (!hostPort) {
        hostPort = await getAvailablePort();
      }

      const additionalPorts: Record<number, number> = {};
      if (containerAdditionalPorts) {
        for (const port of containerAdditionalPorts) {
          if (port === containerPort) {
            throw new Error(
              `Additional port ${port} is already specified as the "containerPort", please use a different port or remove it from "additionalPorts"`,
            );
          }
          additionalPorts[port] = await getAvailablePort();
        }
      }

      function msToNs(ms: number): number {
        return ms * 1000000;
      }

      const ctrl = new AbortController();

      const exists = await docker
        .getImage(image)
        .get()
        .then(() => true)
        .catch(() => false);
      if (!exists) {
        const imageStream = (await docker.pull(image)) as Readable;
        leftoverStack.defer(() => {
          imageStream.destroy();
        });
        ctrl.signal.addEventListener('abort', () => imageStream.destroy(ctrl.signal.reason));
        await new Promise((resolve, reject) => {
          docker.modem.followProgress(
            imageStream,
            (err, res) => (err ? reject(err) : resolve(res)),
            pipeLogs
              ? e => {
                  process.stderr.write(inspect(e) + '\n\n');
                }
              : undefined,
          );
        });
      } else {
        if (pipeLogs) {
          process.stderr.write(`Image "${image}" exists, pull skipped\n\n`);
        }
      }

      const ctr = await docker.createContainer({
        name: containerName,
        Image: image,
        Env: Object.entries(env).map(([name, value]) => `${name}=${value}`),
        ExposedPorts: {
          [containerPort + '/tcp']: {},
          ...Object.keys(additionalPorts).reduce(
            (acc, containerPort) => ({
              ...acc,
              [containerPort + '/tcp']: {},
            }),
            {},
          ),
        },
        Cmd: [...cmd, ...args].filter(Boolean).map(String),
        HostConfig: {
          AutoRemove: true,
          PortBindings: {
            [containerPort + '/tcp']: [{ HostPort: hostPort.toString() }],
            ...Object.entries(additionalPorts).reduce(
              (acc, [containerPort, hostPort]) => ({
                ...acc,
                [containerPort + '/tcp']: [{ HostPort: hostPort.toString() }],
              }),
              {},
            ),
          },
          Binds: Object.values(volumes).map(
            ({ host, container }) => `${path.resolve(cwd, host)}:${container}`,
          ),
        },
        Healthcheck:
          healthcheck.length > 0
            ? {
                Test: healthcheck,
                Interval: msToNs(interval),
                Timeout: 0, // dont wait between tests
                Retries: retries,
              }
            : undefined,
        abortSignal: ctrl.signal,
      });

      let stdboth = '';
      const stream = await ctr.attach({
        stream: true,
        stdout: true,
        stderr: true,
        abortSignal: ctrl.signal,
      });
      stream.on('data', data => {
        stdboth += data.toString();
        if (pipeLogs) {
          process.stderr.write(data);
        }
      });

      await ctr.start();

      let hostname: string;

      const container: Container = {
        containerName,
        name,
        port: hostPort,
        get hostname() {
          return hostname;
        },
        additionalPorts,
        getStd() {
          // TODO: distinguish stdout and stderr
          return stdboth;
        },
        getStats() {
          throw new Error('Cannot get stats of a container.');
        },
        async [DisposableSymbols.asyncDispose]() {
          if (ctrl.signal.aborted) {
            // noop if already disposed
            return;
          }
          ctrl.abort();
          return ctr.stop({ t: 0 });
        },
      };
      leftoverStack.use(container);

      // verify that the container has started
      const startTimeout = AbortSignal.timeout(interval * 2);
      while (!startTimeout.aborted) {
        try {
          await ctr.inspect({ abortSignal: ctrl.signal });
          break;
        } catch (err) {
          if (Object(err).statusCode === 404) {
            throw new DockerError('Container was not started', container);
          }
          throw err;
        }
      }

      // wait for healthy
      if (healthcheck.length > 0) {
        while (!ctrl.signal.aborted) {
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
            await container[DisposableSymbols.asyncDispose]();
            throw new DockerError(
              'Container has "none" health status, but has a healthcheck',
              container,
            );
          } else if (status === 'unhealthy') {
            await container[DisposableSymbols.asyncDispose]();
            throw new DockerError('Container is unhealthy', container);
          } else if (status === 'healthy') {
            break;
          } else if (status === 'starting') {
            continue;
          } else {
            throw new DockerError(`Unknown health status "${status}"`, container);
          }
        }
      } else {
        const hostnames = await waitForReachable(container, ctrl.signal);
        hostname = hostnames?.[0];
      }
      return container;
    },
    async composeWithApollo({
      services,
      trimHostPaths,
      maskServicePorts,
    }: {
      services: Service[];
      trimHostPaths?: boolean;
      maskServicePorts?: boolean;
    }) {
      const subgraphs: ServiceEndpointDefinition[] = [];
      for (const service of services) {
        const hostname = await getLocalHostName(service.port);
        subgraphs.push({
          name: service.name,
          url: `http://${hostname}:${service.port}/graphql`,
        });
      }

      const { supergraphSdl } = await new IntrospectAndCompose({
        subgraphs,
      }).initialize({
        getDataSource(opts) {
          return new RemoteGraphQLDataSource({
            ...opts,
            fetcher: fetch,
          });
        },
        update() {},
        async healthCheck() {},
      });

      let result = supergraphSdl;

      if (trimHostPaths || maskServicePorts) {
        if (trimHostPaths) {
          result = result.replaceAll(__project, '');
        }
        for (const subgraph of services) {
          if (maskServicePorts) {
            result = result.replaceAll(subgraph.port.toString(), `<${subgraph.name}_port>`);
          }
        }
      }

      const output = await tenv.fs.tempfile('supergraph.graphql');
      await tenv.fs.write(output, result);
      return {
        output,
        result,
      };
    },
  };
  return tenv;
}

interface SpawnOptions extends ProcOptions {
  cwd: string;
  shell?: boolean;
  signal?: AbortSignal;
}

function spawn(
  { cwd, pipeLogs = boolEnv('DEBUG'), env = {}, shell, signal }: SpawnOptions,
  cmd: string,
  ...args: (string | number | boolean)[]
): Promise<[proc: Proc, waitForExit: Promise<void>]> {
  const child = childProcess.spawn(cmd, args.filter(Boolean).map(String), {
    cwd,
    // ignore stdin, pipe stdout and stderr
    stdio: ['ignore', 'pipe', 'pipe'],
    env: Object.entries(env).reduce(
      (acc, [key, val]) => ({ ...acc, [key]: String(val) }),
      process.env,
    ),
    shell,
    signal,
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
    [DisposableSymbols.asyncDispose]: () => (child.kill('SIGKILL'), waitForExit),
  };
  leftoverStack.use(proc);

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
      process.stderr.write(str);
    }
  });

  child.once('exit', () => {
    // process ended
    child.stdout.destroy();
    child.stderr.destroy();
  });
  child.once('close', code => {
    // process ended _and_ the stdio streams have been closed
    exit(code ? new Error(`Exit code ${code}\n${trimError(proc.getStd('both'))}`) : null);
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
  return new Promise((resolve, reject) => {
    try {
      server.once('error', reject);
      server.listen(0, () => {
        const addressInfo = server.address() as AddressInfo;
        server.close(err => {
          if (err) {
            reject(err);
          }
          resolve(addressInfo.port);
        });
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function waitForPort(port: number, signal: AbortSignal) {
  while (!signal.aborted) {
    for (const localHostname of localHostnames) {
      try {
        await fetch(`http://${localHostname}:${port}`, { signal });
        return localHostname;
      } catch (err) {
        const errString = err.toString().toLowerCase();
        if (errString.includes('unsupported') || errString.includes('parse error')) {
          return localHostname;
        }
      }
    }
    // no need to track retries, jest will time out aborting the signal
    signal.throwIfAborted();
  }
}

function waitForReachable(server: Server, signal: AbortSignal) {
  const ports = [server.port];
  if ('additionalPorts' in server) {
    ports.push(...Object.values(server.additionalPorts));
  }
  return Promise.all(ports.map(port => waitForPort(port, signal)));
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

export function boolEnv(name: string): boolean {
  return ['1', 't', 'true', 'y', 'yes'].includes(process.env[name]);
}

export function applyMaskServicePorts(result: string, subgraphs: Service[]) {
  for (const subgraph of subgraphs) {
    result = result.replaceAll(subgraph.port.toString(), `<${subgraph.name}_port>`);
  }
  return result;
}
