import { createTenv } from '@e2e/tenv';

const { compose } = createTenv(__dirname);

it('should write compose output to stdout and logs to stderr', async () => {
  const { getStd } = await compose();
  expect(getStd('out')).toContain('type Query @join__type(graph: HELLOWORLD)');
  expect(getStd('err')).toContain('Done!');
});
