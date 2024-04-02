import { createTenv } from '../tenv';

const { serve, spawn, fileExists, deleteFile } = createTenv(__dirname);

it('should serve', async () => {
  await expect(serve()).resolves.toBeDefined();
});

it('should compose', async () => {
  const { waitForExit } = await spawn('yarn', 'mesh-compose', '--target=fusiongraph.graphql');
  await expect(waitForExit).resolves.toBeUndefined();
  await expect(fileExists('fusiongraph.graphql')).resolves.toBeTruthy();
  await deleteFile('fusiongraph.graphql');
});
