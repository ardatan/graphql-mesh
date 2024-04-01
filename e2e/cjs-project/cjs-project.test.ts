import { exec, spawn } from 'child_process';

it('hmm', async () => {
  await cmd('yarn', 'mesh-serve');
  //
});

async function cmd(...command: string[]): Promise<string> {
  const p = spawn(command[0], command.slice(1), {
    cwd: __dirname,
  });
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    p.stdout.on('data', x => {
      stdout += x.toString();
    });
    p.stderr.on('data', x => {
      stderr += x.toString();
    });

    p.on('exit', code => {
      if (code) {
        reject(stderr || stdout);
      } else {
        resolve(stdout);
      }
    });
  });
}
