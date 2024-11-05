import { createTenv } from '@e2e/tenv';
import { fetch, File, FormData } from '@whatwg-node/fetch';

const { compose, serve, service } = createTenv(__dirname);

it('should upload file', async () => {
  const { output } = await compose({ output: 'graphql', services: [await service('bucket')] });
  const { hostname, port } = await serve({ supergraph: output });

  const form = new FormData();
  form.append(
    'operations',
    JSON.stringify({
      query: /* GraphQL */ `
        mutation ($file: Upload!) {
          readFile(file: $file)
        }
      `,
      variables: {
        file: null, // in form data
      },
    }),
  );
  form.append('map', JSON.stringify({ 0: ['variables.file'] }));
  form.append('0', new File(['Hello World!'], 'hello.txt', { type: 'text/plain' }));
  const res = await fetch(`http://${hostname}:${port}/graphql`, {
    method: 'POST',
    body: form,
  });

  await expect(res.json()).resolves.toMatchInlineSnapshot(`
{
  "data": {
    "readFile": "Hello World!",
  },
}
`);
});
