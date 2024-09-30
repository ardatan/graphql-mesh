import { createTenv } from '@e2e/tenv';

const { compose, serve, service, fs } = createTenv(__dirname);

it('should compose and execute', async () => {
  const { output } = await compose({ output: 'graphql', services: [await service('weather')] });

  const supergraph = await fs.read(output);
  expect(supergraph).toContain('chanceOfRain: Float! @hoist');

  const { execute } = await serve({ supergraph: output });
  await expect(
    execute({
      query: /* GraphQL */ `
        {
          narnia {
            chanceOfRain
          }
        }
      `,
    }),
  ).resolves.toEqual({ data: { narnia: { chanceOfRain: 1 } } });
});
