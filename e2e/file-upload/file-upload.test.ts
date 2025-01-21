import { createTenv } from '@e2e/tenv';
import { fetch, File, FormData } from '@whatwg-node/fetch';

it.concurrent('should upload file', async () => {
  await using tenv = createTenv(__dirname);
  await using bucketService = await tenv.service('bucket');
  await using composition = await tenv.compose({ output: 'graphql', services: [bucketService] });
  await using gw = await tenv.gateway({ supergraph: composition.supergraphPath });

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
  const res = await fetch(`http://${gw.hostname}:${gw.port}/graphql`, {
    method: 'POST',
    body: form,
  });

  await expect(res.json()).resolves.toMatchObject({
    data: {
      readFile: 'Hello World!',
    },
  });
});
