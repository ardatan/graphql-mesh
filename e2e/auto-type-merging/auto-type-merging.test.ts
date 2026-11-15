import { createTenv, type Container, type ServeRunner } from '@e2e/tenv';

const { compose, service, serve, container } = createTenv(__dirname);

let petstore!: Container;
beforeAll(async () => {
  petstore = await container({
    name: 'petstore',
    image: 'swaggerapi/petstore3:1.0.7',
    containerPort: 8080,
    healthcheck: ['CMD-SHELL', 'wget --spider http://localhost:8080'],
  });
});

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [petstore, await service('vaccination')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();

  // Federation Connectors entity contract (arg ≠ key → type-level `$this`, no Mesh `@merge` on REST):
  // Query keeps `$args.petId`; Pet entity connector uses `/pet/{$this.id}`.
  expect(result).toMatch(/getPetById\([\s\S]*\$args\.petId/);
  expect(result).toMatch(
    /type Pet[\s\S]*@join__directive\([\s\S]*name:\s*"connect"[\s\S]*\$this\.id/,
  );
  const getPetByIdField = result.match(/getPetById\([\s\S]*?\):\s*Pet[^\n]*/)?.[0] || '';
  expect(getPetByIdField).toContain('$args.petId');
  expect(getPetByIdField).not.toContain('@merge');

  // GraphQL vaccination: Mesh `@merge` (Hive) + virtual `@connect(entity: true)` (Router).
  const petByIdField = result.match(/petById\([\s\S]*?\):\s*Pet[^\n]*/)?.[0] || '';
  expect(petByIdField).toMatch(/@merge\(subgraph:\s*"vaccination"/);
  expect(petByIdField).toMatch(/name:\s*"connect"/);
  expect(petByIdField).toMatch(/entity:\s*true/);
  expect(result).toMatch(/@meshSource\(/);
  // Rename is_vaccinated → isVaccinated stays Mesh `@meshSource` only (no `$this.old`
  // virtual connect — Router requires the old field to still exist on the type).
  expect(result).toMatch(/isVaccinated/);
  expect(result).not.toMatch(/\$this\.is_vaccinated/);
});

/**
 * Federation Connectors-owned fields (HTTP `@connect` on petstore) are the
 * parity path: Hive Gateway and Apollo Router return the same `id` / `name` on
 * the same SDL.
 *
 * Virtual `@connect(entity: true)` on `petById` makes Router treat vaccination as
 * an entity connector (requestless `$args` mapping) — it does **not** HTTP-call
 * Yoga. Hive still fills `isVaccinated` via `@merge`.
 */
describe.each(['hive', 'apollo-router'] as ServeRunner[])(
  'dual Federation Connectors parity with %s (id/name)',
  runner => {
    it('getPetById id+name match on both runners', async () => {
      const { output } = await compose({
        output: 'graphql',
        services: [petstore, await service('vaccination')],
      });
      const { execute } = await serve({ runner, supergraph: output });
      const result = await execute({
        query: /* GraphQL */ `
          query GetPet {
            getPetById(petId: 1) {
              id
              name
            }
          }
        `,
      });
      expect(result.errors).toBeFalsy();
      expect(result.data).toEqual({
        getPetById: {
          id: 1,
          name: 'Cat 1',
        },
      });
    });
  },
);

it('Hive fills isVaccinated via Mesh @merge (GraphQL vaccination)', async () => {
  const { output } = await compose({
    output: 'graphql',
    services: [petstore, await service('vaccination')],
  });
  const { execute } = await serve({ runner: 'hive', supergraph: output });
  const result = await execute({
    query: /* GraphQL */ `
      query GetPet {
        getPetById(petId: 1) {
          id
          name
          isVaccinated
        }
      }
    `,
  });
  expect(result.errors).toBeFalsy();
  expect(result.data).toEqual({
    getPetById: {
      id: 1,
      name: 'Cat 1',
      isVaccinated: false,
    },
  });
});

it('Router starts with virtual entity:true; id/name from petstore HTTP connect', async () => {
  const { output, result: sdl } = await compose({
    output: 'graphql',
    services: [petstore, await service('vaccination')],
  });
  expect(sdl).toMatch(/petById\([\s\S]*name:\s*"connect"/);
  expect(sdl).toMatch(/entity:\s*true/);
  expect(sdl).not.toMatch(/\$this\.is_vaccinated/);

  const { execute } = await serve({
    runner: 'apollo-router' satisfies ServeRunner,
    supergraph: output,
  });
  const result = await execute({
    query: /* GraphQL */ `
      query GetPet {
        getPetById(petId: 1) {
          id
          name
        }
      }
    `,
  });
  expect(result.errors).toBeFalsy();
  expect(result.data).toEqual({
    getPetById: {
      id: 1,
      name: 'Cat 1',
    },
  });
});
