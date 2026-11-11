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
  // GraphQL vaccination subgraph still uses Mesh `@merge`.
  expect(result).toMatch(/petById\([\s\S]*@merge\(subgraph:\s*"vaccination"/);
});

describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
  it.concurrent.each([
    {
      name: 'GetPet',
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
    },
  ])('should execute $name', async ({ query }) => {
    const { output } = await compose({
      output: 'graphql',
      services: [petstore, await service('vaccination')],
    });
    const { execute } = await serve({ runner, supergraph: output });
    await expect(execute({ query })).resolves.toMatchSnapshot();
  });
});
