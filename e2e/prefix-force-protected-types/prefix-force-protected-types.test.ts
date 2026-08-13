import { createTenv } from '@e2e/tenv';

const { compose, serve, service, fs } = createTenv(__dirname);

it('prefixes forced protected scalars and executes against them', async () => {
  const events = await service('events');
  const { output } = await compose({
    services: [events],
    output: 'graphql',
  });

  const supergraph = await fs.read(output);
  expect(supergraph).toContain('Events_Event');
  expect(supergraph).toContain('Events_DateTime');
  expect(supergraph).not.toMatch(/\bscalar DateTime\b/);
  expect(supergraph).toContain('scalar Events_DateTime');

  const { execute } = await serve({ supergraph: output });
  await expect(
    execute({
      query: /* GraphQL */ `
        {
          nextEvent {
            name
            startsAt
          }
        }
      `,
    }),
  ).resolves.toEqual({
    data: {
      nextEvent: {
        name: 'MeshConf',
        startsAt: '2030-01-01T00:00:00.000Z',
      },
    },
  });
});
