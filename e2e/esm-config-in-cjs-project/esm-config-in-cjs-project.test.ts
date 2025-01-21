import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

it.concurrent('should serve', async () => {
  await using tenv = createTenv(__dirname);
  await using gw = await tenv.gateway({
    supergraph: await tenv.fs.tempfile('supergraph.graphql', 'type Query { hello: String }'),
  });
  const res = await fetch(`http://${gw.hostname}:${gw.port}/healthcheck`);
  expect(res.ok).toBeTruthy();
});

it.concurrent('should compose', async () => {
  await using tenv = createTenv(__dirname);
  await using proc = await tenv.compose();
  expect(proc.supergraphSdl).toMatchSnapshot();
});
