import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose', async () => {
  const proc = await compose();
  expect(proc.result).toMatchSnapshot();
});

it('should serve', async () => {
  const proc = await serve({
    runner: {
      docker: {
        volumes: [
          {
            host: './jsconfig.json',
            container: '/serve/jsconfig.json',
          },
          {
            host: './mesh.config.ts',
            container: '/serve/mesh.config.ts',
          },
          {
            host: './folder',
            container: '/serve/folder',
          },
        ],
      },
    },
  });
  const res = await fetch(`http://0.0.0.0:${proc.port}/healthcheck`);
  expect(res.ok).toBeTruthy();
});
