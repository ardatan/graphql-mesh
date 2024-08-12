import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

const { serve, compose } = createTenv(__dirname);

it('should serve', async () => {
  const proc = await serve({
    args: ['--native-import'],
  });
  const res = await fetch(`http://0.0.0.0:${proc.port}/healthcheck`);
  expect(res.ok).toBeTruthy();
});

it('should compose', async () => {
  const proc = await compose({
    args: ['--native-import'],
  });
  expect(proc.result).toMatchSnapshot();
});
