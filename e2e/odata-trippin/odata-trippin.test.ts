import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose();
  expect(result).toMatchSnapshot();
});

it('executes a query', async () => {
  const { output } = await compose({
    output: 'graphql',
  });
  const { execute } = await serve({ supergraph: output });
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
