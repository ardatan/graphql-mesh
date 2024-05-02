import { createTenv } from '@e2e/tenv';

const { serve } = createTenv(__dirname);

it('should destroy pubsub on process kill signal', async () => {
  const { dispose } = await serve();
  await expect(dispose()).resolves.toBeUndefined();
});
