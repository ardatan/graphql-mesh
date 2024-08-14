import { createTenv } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [await service('greetings'), await service('helloer')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it('should execute the query', async () => {
  const { output } = await compose({
    output: 'graphql',
    services: [await service('greetings'), await service('helloer')],
  });
  const { execute } = await serve({ supergraph: output });
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
