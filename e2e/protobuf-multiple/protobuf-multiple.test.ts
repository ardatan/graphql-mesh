import { createTenv, type Serve } from '@e2e/tenv';

describe('gRPC Multiple', () => {
  const { compose, service, serve } = createTenv(__dirname);
  const queries = {
    GetAllPets: /* GraphQL */ `
      query GetAllPets {
        GetAllPets {
          pets {
            id
            name
          }
        }
      }
    `,
    GetAllPetStores: /* GraphQL */ `
      query GetAllPetStores {
        GetAllPetStores {
          petStores {
            id
            name
          }
        }
      }
    `,
  };
  let gw: Serve;
  let supergraph: string;
  beforeAll(async () => {
    const { output, result } = await compose({
      services: [await service('Pets'), await service('Stores')],
      output: 'graphql',
    });
    supergraph = result;
    gw = await serve({
      supergraph: output,
    });
  });
  it('composes', async () => {
    const { result } = await compose({
      services: [await service('Pets'), await service('Stores')],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
  });
  for (const queryName in queries) {
    it('works', async () => {
      const result = await gw.execute({
        query: queries[queryName],
      });
      expect(result).toMatchSnapshot(queryName);
    });
  }
});
