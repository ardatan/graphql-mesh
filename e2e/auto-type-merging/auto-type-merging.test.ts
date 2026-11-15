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

  // Connectors entity contract (arg ≠ key → type-level `$this`, no Mesh `@merge` on REST):
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
});

it('should execute GetPet on hive (Mesh @merge still fills vaccinated)', async () => {
  const { output } = await compose({
    output: 'graphql',
    services: [petstore, await service('vaccination')],
  });
  const { execute } = await serve({ runner: 'hive', supergraph: output });
  const result = await execute({
    query: /* GraphQL */ `
      query GetPet {
        getPetById(petId: 1) {
          __typename
          id
          name
          vaccinated
        }
      }
    `,
  });
  expect(result.errors).toBeFalsy();
  expect(result.data).toEqual({
    getPetById: {
      __typename: 'Pet',
      id: 1,
      name: 'Cat 1',
      vaccinated: false,
    },
  });
});

it('apollo-router loads dual-annotated SDL; virtual connect cannot GraphQL-fetch vaccinated', async () => {
  const { output, result: sdl } = await compose({
    output: 'graphql',
    services: [petstore, await service('vaccination')],
  });
  expect(sdl).toMatch(/petById\([\s\S]*name:\s*"connect"/);
  const servePromise = serve({
    runner: 'apollo-router' satisfies ServeRunner,
    supergraph: output,
  });
  try {
    const { execute } = await servePromise;
    const result = await execute({
      query: /* GraphQL */ `
        query GetPet {
          getPetById(petId: 1) {
            id
            name
            vaccinated
          }
        }
      `,
    });
    // Router ignores Mesh @merge; virtual @connect has no http to vaccination Yoga.
    expect(result.data?.getPetById?.vaccinated ?? null).toBeNull();
  } catch (err) {
    expect(String(err)).toMatch(/500|INTERNAL_SERVER_ERROR|Connector|error|Unknown type|_entities/i);
  }
});
