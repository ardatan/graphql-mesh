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
        child.stdout.once('close', () => stop());
      }),
      stderr: new Repeater((push, stop) => {
        child.stderr.on('data', async x => {
          await push(x.toString());
        });
        child.stderr.once('error', err => stop(err));
        child.stderr.once('close', () => stop());
      }),
      kill: code => child.kill(code),
      waitForExit: new Promise(resolve => (exit = resolve)),
    };
    leftovers.push(proc);

    child.once('exit', code => {
      leftovers = leftovers.filter(leftover => leftover !== proc);
      child.stdin.end();
      child.stdout.destroy();
      child.stderr.destroy();
      child.removeAllListeners();
      exit(code);
    });

    return new Promise((resolve, reject) => {
      child.once('error', reject);
      resolve(proc);
    });
  };
}
