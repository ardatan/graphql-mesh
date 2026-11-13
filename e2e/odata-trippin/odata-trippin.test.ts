import { createTenv, type ServeRunner } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

// Complex/nav `$expand` on Apollo Router is a follow-up; e2e covers Connectors
// entity fetch + nested complex types (AddressInfo) on both Hive and Router.
const getMeQuery = /* GraphQL */ `
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
    }
  }
`;

it('should compose the appropriate schema', async () => {
  const { result } = await compose();
  expect(result).toMatchSnapshot();
});

describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
  it('executes GetMe', async () => {
    const composition = await compose({ output: 'graphql' });
    const { execute } = await serve({
      runner,
      supergraph: composition.output,
    });
    await expect(execute({ query: getMeQuery })).resolves.toMatchSnapshot();
  });
});
