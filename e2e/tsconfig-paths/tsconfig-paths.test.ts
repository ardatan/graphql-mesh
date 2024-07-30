import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose', async () => {
  const proc = await compose();
  expect(proc.result).toMatchSnapshot();
});

it('should serve', async () => {
  const proc = await serve();
  const res = await fetch(`http://0.0.0.0:${proc.port}/healthcheck`);
  expect(res.ok).toBeTruthy();
});
