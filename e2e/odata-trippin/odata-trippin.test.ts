import { createTenv, type ServeRunner } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

// Same composed Connectors SDL on Hive + Apollo Router: singleton + complex props,
// and entity-set navigation (`Friends` / `Trips` via `/People/{$this.UserName}/…`).
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
    PeopleByUserName(UserName: "russellwhyte") {
      UserName
      FirstName
      Friends(queryOptions: { top: 2 }) {
        UserName
        FirstName
      }
      Trips(queryOptions: { top: 1 }) {
        TripId
        Name
      }
    }
  }
`;

it('should compose the appropriate schema', async () => {
  const { result } = await compose();
  expect(result).toMatchSnapshot();
});

describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
  it('executes GetMe with nav', async () => {
    const composition = await compose({ output: 'graphql' });
    const { execute } = await serve({
      runner,
      supergraph: composition.output,
    });
    await expect(execute({ query: getMeQuery })).resolves.toMatchSnapshot();
  });
});
