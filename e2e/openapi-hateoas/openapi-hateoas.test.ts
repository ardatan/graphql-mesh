import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose', async () => {
  const { result } = await compose({ output: 'graphql' });
  expect(result).toMatchSnapshot();
});
