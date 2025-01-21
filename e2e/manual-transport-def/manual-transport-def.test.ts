import { createTenv } from '@e2e/tenv';

const { compose, gateway, service } = createTenv(__dirname);

it.concurrent('should compose the appropriate schema', async () => {
  const { supergraphSdl: result } = await compose({
    services: [await service('greetings'), await service('helloer')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent('should execute the query', async () => {
  const { supergraphPath } = await compose({
    output: 'graphql',
    services: [await service('greetings'), await service('helloer')],
  });
  const { execute } = await gateway({ supergraph: supergraphPath });
  await expect(
    execute({
      query: /* GraphQL */ `
        query {
          greet(name: "world") {
            greeting
          }
          hello
        }
      `,
    }),
  ).resolves.toMatchSnapshot();
});
