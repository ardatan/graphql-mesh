import { createTenv } from '@e2e/tenv';

const { serve, compose, fs } = createTenv(__dirname);

it('should write serve logs to stderr', async () => {
  await using serveInstance = await serve({
    supergraph: await fs.tempfile('supergraph.graphql', 'type Query { hello: String }'),
  });
  expect(serveInstance.getStd('err')).toContain('Listening on');
});

it('should write compose output to stdout and logs to stderr', async () => {
  const { getStd } = await compose();
  expect(getStd('err')).toContain('Done!');
});
