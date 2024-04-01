// eslint-disable-next-line import/no-nodejs-modules
import childProcess from 'child_process';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Repeater } from '@repeaterjs/repeater';

export interface Proc {
  stdout: Repeater<string>;
  stderr: Repeater<string>;
  kill(code?: number): void;
  waitForExit: Promise<number | null>;
}

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

export function createSpawn(cwd: string): (cmd: string, ...args: string[]) => Promise<Proc> {
  return async function spawn(cmd, ...args) {
    const child = childProcess.spawn(cmd, args, { cwd });

    let exit: (code: number) => void;
    const proc: Proc = {
      stdout: new Repeater((push, stop) => {
        child.stdout.on('data', async x => {
          await push(x.toString());
        });
        child.stdout.once('error', err => stop(err));
      }),
      stderr: new Repeater((push, stop) => {
        child.stderr.on('data', async x => {
          await push(x.toString());
        });
        child.stderr.once('error', err => stop(err));
      }),
      kill: code => child.kill(code),
      waitForExit: new Promise(resolve => (exit = resolve)),
    };
    leftovers.push(proc);

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', x => {
      stdout += x.toString();
    });
    child.stderr.on('data', x => {
      stderr += x.toString();
    });

    child.once('exit', code => {
      leftovers = leftovers.filter(leftover => leftover !== proc);

      const err =
        code === 0 || code == null
          ? undefined
          : new Error(`Exit code ${code}\n${stderr || stdout}`);
      child.stdout.emit('error', err);
      child.stderr.emit('error', err);

      child.stdin.end();
      child.stdout.destroy();
      child.stderr.destroy();
      child.removeAllListeners();

      exit(code);
    });

    return new Promise((resolve, reject) => {
      child.stdout.once('error', reject);
      child.stderr.once('error', reject);
      child.once('error', reject);
      resolve(proc);
    });
  };
}
