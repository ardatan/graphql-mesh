/* eslint-disable import/no-nodejs-modules */
import childProcess from 'child_process';
import fs from 'fs/promises';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import { setTimeout } from 'timers/promises';

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

export interface Serve extends Proc {
  port: number;
}

export interface Compose extends Proc {
  result: string;
}

export interface Tenv {
  serve(port?: number): Promise<Serve>;
  compose(target?: string): Promise<Compose>;
}

export function createTenv(cwd: string): Tenv {
  return {
    async serve(port = getAvailablePort()) {
      const proc = await spawn({ cwd }, 'yarn', 'mesh-serve', `--port=${port}`);
      await Promise.race([
        proc.waitForExit.then(() =>
          Promise.reject(
            new Error(`Serve exited successfully, but shouldn't have.\n${proc.getStd('both')}`),
          ),
        ),
        // waitForHealthcheckReady
        (async () => {
          let retries = 0;
          for (;;) {
            try {
              await fetch(`http://0.0.0.0:${port}/healthcheck`);
              break;
            } catch (err) {
              if (++retries > 10) {
                throw new Error(`Serve healthcheck failed.\n${proc.getStd('both')}`);
              }
              await setTimeout(500);
            }
          }
        })(),
      ]);
      return { ...proc, port };
    },
    async compose(target) {
      const proc = await spawn({ cwd }, 'yarn', 'mesh-compose', target && `--target=${target}`);
      await proc.waitForExit;
      let result = '';
      if (target) {
        result = await fs.readFile(path.join(cwd, target), 'utf-8');
      } else {
        result = proc.getStd('out');
      }
      return { ...proc, result };
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
    stderr += x.toString();
    stdboth += x.toString();
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

    child.stdin.end();
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
