import { createTenv } from '@e2e/tenv';

const { compose, gateway } = createTenv(__dirname);

it.concurrent('should compose the appropriate schema', async () => {
  const { supergraphSdl: result } = await compose();
  expect(result).toMatchSnapshot();
});

it.concurrent('executes a query', async () => {
  const { supergraphPath } = await compose({
    output: 'graphql',
  });
  const { execute } = await gateway({ supergraph: supergraphPath });
  const result = await execute({
    query: /* GraphQL */ `
      query GetMe {
        Me {
          UserName
          FirstName
          LastName
          Gender
          FavoriteFeature
          AddressInfo {
            Address
            City {
              Name
              Region
              CountryRegion
            }
          }
          Trips(queryOptions: { top: 1 }) {
            Description
          }
        }
      }
    `,
  });
  expect(result).toMatchSnapshot();
});
