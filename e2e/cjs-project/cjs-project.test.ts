import { createSpawn, getAvailablePort } from '../utils';

const spawn = createSpawn(__dirname);

it('should start mesh serve', async () => {
  const port = await getAvailablePort();
  const { stdout, kill } = await spawn('yarn', 'mesh-serve', port);

  for await (const o of stdout) {
    if (o.includes('Started server on')) {
      kill();
    }
  }
});
