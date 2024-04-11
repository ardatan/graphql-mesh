import { Container, createTenv } from '@e2e/tenv';

const { container, compose, serve } = createTenv(__dirname);

let petstore!: Container;
beforeAll(async () => {
  petstore = await container({
    name: 'petstore',
    image: 'swaggerapi/petstore3',
    containerPort: 8080,
    healthcheck: ['CMD-SHELL', 'wget --spider http://0.0.0.0:8080'],
  });
});

it('should compose the appropriate schema', async () => {
  const { result } = await compose({ services: [petstore], maskServicePorts: true });
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
        }
      }
    `,
  },
])('should execute $name', async ({ query }) => {
  const { target } = await compose({ target: 'graphql', services: [petstore] });
  const { execute } = await serve({ fusiongraph: target });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
