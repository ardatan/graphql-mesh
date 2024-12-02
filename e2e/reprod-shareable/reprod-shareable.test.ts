import { createTenv } from '@e2e/tenv';

const { compose } = createTenv(__dirname);

it('composes', async () => {
  const { result } = await compose();
  expect(result).toMatchSnapshot();
});
