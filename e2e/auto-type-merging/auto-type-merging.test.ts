import { createTenv } from '@e2e/tenv';

const { compose, service, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [await service('vaccination')],
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
  const { target } = await compose({ target: 'graphql', services: [await service('vaccination')] });
  const { execute } = await serve({ fusiongraph: target });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
