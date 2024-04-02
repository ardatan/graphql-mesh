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

export interface Serve {
  port: number;
  kill(): void;
}

export interface Tenv {
  serve(): Promise<Serve>;
  compose(target?: string): Promise<string>;
}

export function createTenv(cwd: string): Tenv {
  return {
    async serve() {
      const port = getAvailablePort();
      const proc = await spawn({ cwd }, 'yarn', 'mesh-serve', `--port=${port}`);
      await Promise.race([
        proc.waitForExit.then(() =>
          Promise.reject(
            new Error(`Serve exited successfully, but shouldn't have.\n${proc.stdboth.join('\n')}`),
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
              if (++retries > 5) {
                throw new Error(`Serve healthcheck failed.\n${proc.stdboth.join('\n')}`);
              }
              await setTimeout(500);
            }
          }
        })(),
      ]);
      return { port, kill: proc.kill };
    },
    async compose(target = 'fusiongraph.graphql') {
      const { waitForExit } = await spawn({ cwd }, 'yarn', 'mesh-compose', `--target=${target}`);
      await waitForExit;
      const result = await fs.readFile(path.join(cwd, target), 'utf-8');
      await fs.unlink(path.join(cwd, target));
      return result;
    },
  };
}

interface Proc {
  stdout: string[];
  stderr: string[];
  stdboth: string[];
  kill(code?: number): void;
  waitForExit: Promise<void>;
}

interface SpawnOptions {
  cwd: string;
}

function spawn({ cwd }: SpawnOptions, cmd: string, ...args: (string | number)[]): Promise<Proc> {
  const child = childProcess.spawn(cmd, args.map(String), { cwd });

  let exit: (err: Error | null) => void;
  const proc: Proc = {
    stdout: [],
    stderr: [],
    stdboth: [],
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
    proc.stdout.push(x.toString());
    proc.stdboth.push(x.toString());
  });
  child.stderr.on('data', x => {
    proc.stderr.push(x.toString());
    proc.stdboth.push(x.toString());
  });
  child.once('exit', code => {
    leftovers = leftovers.filter(leftover => leftover !== proc);

    const err =
      code === 0 || code == null
        ? undefined
        : new Error(`Exit code ${code}\n${proc.stdboth.join('\n')}`);
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
    child.stdout.once('error', reject);
    child.stderr.once('error', reject);
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
