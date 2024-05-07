import { createTenv } from '@e2e/tenv';

const { serve, compose } = createTenv(__dirname);

it('should not consume a lot of memory', async () => {
  const { output } = await compose({ output: 'graphql' });
  const { execute } = await serve({ fusiongraph: output });
});
