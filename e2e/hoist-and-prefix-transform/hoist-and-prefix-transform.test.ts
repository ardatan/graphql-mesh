import { createTenv, type Service } from '@e2e/tenv';

const { compose, serve, service, fs } = createTenv(__dirname);

let weather: Service;

beforeAll(async () => {
  weather = await service('weather');
});

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [weather],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it('should compose and execute', async () => {
  const { output } = await compose({ output: 'graphql', services: [weather] });

  // hoisted
  const supergraph = await fs.read(output);
  expect(supergraph).toContain('Test_Weather');
  expect(supergraph).toContain('chanceOfRain');

  const { execute } = await serve({ supergraph: output });
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
