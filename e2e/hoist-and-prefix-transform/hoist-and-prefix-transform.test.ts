import { createTenv, type Service } from '@e2e/tenv';

const { compose, gateway, service, fs } = createTenv(__dirname);

let weather: Service;

beforeAll(async () => {
  weather = await service('weather');
});

it.concurrent('should compose the appropriate schema', async () => {
  const { supergraphSdl: result } = await compose({
    services: [weather],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent('should compose and execute', async () => {
  const { supergraphPath } = await compose({ output: 'graphql', services: [weather] });

  // hoisted
  const supergraph = await fs.read(supergraphPath);
  expect(supergraph).toContain('Test_Weather');
  expect(supergraph).toContain('chanceOfRain');

  const { execute } = await gateway({ supergraph: supergraphPath });
  await expect(
    execute({
      query: /* GraphQL */ `
        {
          here {
            chanceOfRain
          }
        }
      `,
    }),
  ).resolves.toEqual({ data: { here: { chanceOfRain: 1 } } });
});
