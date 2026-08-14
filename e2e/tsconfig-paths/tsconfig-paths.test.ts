import { createTenv } from '@e2e/tenv';

const { compose } = createTenv(__dirname);

it('should compose', async () => {
  const proc = await compose({
    env: {
      HIVE_IMPORTER_TSCONFIG_SEARCH_PATH: 'tsconfig-paths.tsconfig.json',
    },
  });
  expect(proc.result).toMatchSnapshot();
});
