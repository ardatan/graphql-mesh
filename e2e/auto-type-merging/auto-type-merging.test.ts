import { Container, createTenv } from '@e2e/tenv';

const { compose, service, serve, container } = createTenv(__dirname);

let petstore!: Container;
beforeAll(async () => {
  petstore = await container({
    name: 'petstore',
    image: 'swaggerapi/petstore3:1.0.7',
    containerPort: 8080,
    healthcheck: ['CMD-SHELL', 'wget --spider http://0.0.0.0:8080'],
  });
});

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [petstore, await service('vaccination')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

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
  const { target } = await compose({
    target: 'graphql',
    services: [petstore, await service('vaccination')],
  });
  const { execute } = await serve({ fusiongraph: target });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
