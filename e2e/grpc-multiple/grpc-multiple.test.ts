import { createTenv, type Serve } from '@e2e/tenv';

describe('gRPC Multiple', () => {
  it.concurrent('composes', async () => {
    await using tenv = createTenv(__dirname);
    await using Pets = await tenv.service('Pets');
    await using Stores = await tenv.service('Stores');
    await using composition = await tenv.compose({
      services: [Pets, Stores],
      maskServicePorts: true,
    });
    expect(composition.supergraphSdl).toMatchSnapshot();
  });
  it.concurrent.each([
    {
      name: 'GetAllPets',
      query: /* GraphQL */ `
        query GetAllPets {
          GetAllPets {
            pets {
              id
              name
            }
          }
        }
      `,
    },
    {
      name: 'GetAllPetStores',
      query: /* GraphQL */ `
        query GetAllPetStores {
          GetAllPetStores {
            petStores {
              id
              name
            }
          }
        }
      `,
    },
  ])(`$name`, async ({ query }) => {
    await using tenv = createTenv(__dirname);
    await using Pets = await tenv.service('Pets');
    await using Stores = await tenv.service('Stores');
    await using composition = await tenv.compose({
      services: [Pets, Stores],
      output: 'graphql',
    });
    await using gw = await tenv.gateway({
      supergraph: composition.supergraphPath,
    });
    const result = await gw.execute({
      query,
    });
    expect(result).toMatchSnapshot();
  });
});
