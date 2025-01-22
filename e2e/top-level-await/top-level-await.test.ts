import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

const { gateway, compose, fs } = createTenv(__dirname);

it.concurrent('should serve', async () => {
  const proc = await gateway({
    supergraph: await fs.tempfile('supergraph.graphql', 'type Query { hello: String }'),
  });
  const res = await fetch(`http://${proc.hostname}:${proc.port}/healthcheck`);
  expect(res.ok).toBeTruthy();
});

it.concurrent('should compose', async () => {
  const proc = await compose();
  expect(proc.supergraphSdl).toMatchSnapshot();
});
