import { createTenv } from '@e2e/tenv';

const { compose } = createTenv(__dirname);

it.concurrent('composes', async () => {
  const { supergraphSdl: result } = await compose();
  expect(result).toMatchSnapshot();
});
