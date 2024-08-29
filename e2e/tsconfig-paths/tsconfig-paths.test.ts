import { createTenv } from '@e2e/tenv';

const { compose, serve, fs } = createTenv(__dirname);

it('should compose', async () => {
  const proc = await compose({
    env: {
      MESH_INCLUDE_TSCONFIG_SEARCH_PATH: 'tsconfig-paths.tsconfig.json',
    },
  });
  expect(proc.result).toMatchSnapshot();
});

it('should serve', async () => {
  const proc = await serve({
    supergraph: await fs.tempfile('supergraph.graphql', 'type Query { hello: String }'),
    env: {
      MESH_INCLUDE_TSCONFIG_SEARCH_PATH: 'tsconfig-paths.tsconfig.json',
    },
    runner: {
      docker: {
        volumes: [
          {
            host: './tsconfig-paths.tsconfig.json',
            container: '/serve/tsconfig-paths.tsconfig.json',
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
