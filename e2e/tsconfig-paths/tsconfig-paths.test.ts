import { createTenv } from '@e2e/tenv';

const { compose } = createTenv(__dirname);

it.concurrent('should compose', async () => {
  await using tenv = createTenv(__dirname);
  await using composition = await tenv.compose({
    env: {
      MESH_INCLUDE_TSCONFIG_SEARCH_PATH: 'tsconfig-paths.tsconfig.json',
    },
  });
  expect(composition.supergraphSdl).toMatchSnapshot();
});
