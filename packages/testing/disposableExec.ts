import { exec } from 'child_process';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

export function disposableExec(...params: Parameters<typeof exec>) {
  const cmd = exec(...params);
  return {
    get stderr() {
      return cmd.stderr;
    },
    get stdout() {
      return cmd.stdout;
    },
    [DisposableSymbols.dispose]() {
      cmd.kill('SIGKILL');
    },
  };
}
