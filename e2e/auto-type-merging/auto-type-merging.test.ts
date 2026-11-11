import { createTenv, type Container } from '@e2e/tenv';

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
  // GraphQL vaccination subgraph still uses Mesh `@merge` (auto-type-merging intent).
  expect(result).toMatch(/petById\([\s\S]*@merge\(subgraph:\s*"vaccination"/);
});

// Hive-only: vaccination is a plain GraphQL schema merged via Mesh `@merge`.
// Apollo Router plans Federation `_entities` against it and fails validation
// (`Unknown type "_Any"` / `Cannot query field "_entities"`). Making vaccination
// a Federation subgraph would dual-run, but would abandon the `@merge` test intent.
it('should execute GetPet on hive', async () => {
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
