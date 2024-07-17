import { createTenv } from '@e2e/tenv';

const { serve, compose } = createTenv(__dirname);

it('should write serve logs to stderr', async () => {
  await using serveInstance = await serve();
  expect(serveInstance.getStd('err')).toContain('Starting server on');
});

it('should write compose output to stdout and logs to stderr', async () => {
  const { getStd } = await compose();
  expect(getStd('err')).toContain('Done!');
});
