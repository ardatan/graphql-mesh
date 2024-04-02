import { createTenv } from '../tenv';

const { serve, compose } = createTenv(__dirname);

it('should serve', async () => {
  await expect(serve()).resolves.toBeDefined();
});

it('should compose', async () => {
  await expect(compose()).resolves.toBeDefined();
});
