import { createTenv } from '../tenv';

const { spawn, getAvailablePort, fileExists, deleteFile } = createTenv(__dirname);

it('should serve', async () => {
  const { stdout, kill } = await spawn('yarn', 'mesh-serve', getAvailablePort());

  for await (const o of stdout) {
    if (o.includes('Started server on')) {
      kill();
    }
  }
});

it('should compose', async () => {
  const { waitForExit } = await spawn('yarn', 'mesh-compose');
  await expect(waitForExit).resolves.toBeUndefined();
  await expect(fileExists('fusiongraph.graphql')).resolves.toBeTruthy();
  await deleteFile('fusiongraph.graphql');
});
