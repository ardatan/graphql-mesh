import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

const { serve, compose, fs } = createTenv(__dirname);

it('should compose and serve', async () => {
  const { result: composedSchema } = await compose();
  expect(composedSchema).toMatchSnapshot();

  const supergraphPath = await fs.tempfile('supergraph.graphql');
  await fs.write(supergraphPath, composedSchema);
  const { hostname, port } = await serve({ supergraph: supergraphPath });
  const res = await fetch(`http://${hostname}:${port}/graphql?query={hello}`);
  expect(res.ok).toBeTruthy();
  await expect(res.text()).resolves.toMatchInlineSnapshot(`"{"data":{"hello":"world"}}"`);
});
