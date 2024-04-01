import { createSpawn } from '../utils';

const spawn = createSpawn(__dirname);

it('should start mesh serve', async () => {
  const { stdout, kill } = await spawn('yarn', 'mesh-serve');

  for await (const o of stdout) {
    if (o.includes('Started server on')) {
      kill();
    }
  }
});
