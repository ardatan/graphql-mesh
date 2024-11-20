import { createTenv } from '@e2e/tenv';

const { serve, compose, fs } = createTenv(__dirname);

it('should write serve logs to stderr', async () => {
  await using serveInstance = await serve({
    supergraph: await fs.tempfile('supergraph.graphql', 'type Query { hello: String }'),
  });
  // stdout from serve because it uses the default logger that uses console.log
  expect(serveInstance.getStd('out')).toContain('Serving local supergraph from');
});

it('should write compose output to stdout and logs to stderr', async () => {
  const { getStd } = await compose();
  expect(getStd('err')).toContain('Done!');
});
