import { createTenv, type ServeRunner } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

// IPerson union: full field bags in match arms (same HTTP JSON — no key-stub
// re-fetch). Missing `@odata.type` (odata.metadata=minimal) uses
// `$($->get("@odata.type") ?? "#…")->match` so Apollo does not None-short-circuit.
const getMeQuery = /* GraphQL */ `
  query GetMe {
    Me {
      ... on Person {
        UserName
        FirstName
      }
      ... on Manager {
        UserName
        FirstName
        Budget
      }
      ... on Employee {
        UserName
        FirstName
        Cost
      }
    }
    PeopleByUserName(UserName: "russellwhyte") {
      ... on Person {
        UserName
        FirstName
        Friends(queryOptions: { top: 2 }) {
          ... on Person {
            UserName
            FirstName
          }
          ... on Manager {
            UserName
            FirstName
          }
          ... on Employee {
            UserName
            FirstName
          }
        }
        Trips(queryOptions: { top: 1 }) {
          TripId
          Name
        }
      }
      ... on Manager {
        UserName
        FirstName
        Friends(queryOptions: { top: 2 }) {
          ... on Person {
            UserName
            FirstName
          }
          ... on Manager {
            UserName
            FirstName
          }
          ... on Employee {
            UserName
            FirstName
          }
        }
        Trips(queryOptions: { top: 1 }) {
          TripId
          Name
        }
      }
      ... on Employee {
        UserName
        FirstName
        Friends(queryOptions: { top: 2 }) {
          ... on Person {
            UserName
            FirstName
          }
          ... on Manager {
            UserName
            FirstName
          }
          ... on Employee {
            UserName
            FirstName
          }
        }
        Trips(queryOptions: { top: 1 }) {
          TripId
          Name
        }
      }
    }
  }
`;

it('should compose the appropriate schema', async () => {
  const { result } = await compose();
  expect(result).toMatchSnapshot();
  expect(result).toMatch(/union IPerson/);
  expect(result).toMatch(/union ILocation/);
  expect(result).toMatch(/union IPlanItem/);
  expect(result).toMatch(/BossOffice/);
  expect(result).toMatch(/\$\(\$->get\(/);
  expect(result).toMatch(/\?\?/);
  expect(result).toMatch(/entity:\s*true/);
  // Connectors entity contract — no Mesh `@merge`; nested-only Trip is non-resolvable.
  expect(result).not.toMatch(/@merge\(/);
  expect(result).toMatch(
    /type Trip[\s\S]*@join__type\(graph: TRIPPIN,\s*key: "TripId",\s*resolvable: false\)/,
  );
});

const planItemsQuery = /* GraphQL */ `
  query PlanItemsPolymorphic {
    PeopleByUserName(UserName: "russellwhyte") {
      ... on Person {
        Trips(queryOptions: { top: 1 }) {
          TripId
          PlanItems(queryOptions: { top: 5 }) {
            ... on PlanItem {
              PlanItemId
              ConfirmationCode
            }
            ... on Flight {
              PlanItemId
              FlightNumber
              SeatNumber
            }
            ... on Event {
              PlanItemId
              Description
              OccursAt {
                BuildingInfo
                Address
              }
            }
            ... on PublicTransportation {
              PlanItemId
              ConfirmationCode
            }
          }
        }
      }
    }
  }
`;

describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
  it('executes GetMe with nav', async () => {
    const composition = await compose({ output: 'graphql' });
    const { execute } = await serve({
      runner,
      supergraph: composition.output,
    });
    const result = await execute({ query: getMeQuery });
    expect(result.errors).toBeUndefined();
    const me = result.data?.Me as Record<string, unknown> | undefined;
    expect(me?.UserName).toEqual(expect.any(String));
    expect(me?.FirstName).toEqual(expect.any(String));
    const person = result.data?.PeopleByUserName as Record<string, unknown> | undefined;
    expect(person?.UserName).toBe('russellwhyte');
    expect(Array.isArray(person?.Friends)).toBe(true);
  });

  it('executes PlanItems with Flight/Event exclusive fields', async () => {
    const composition = await compose({ output: 'graphql' });
    const { execute } = await serve({
      runner,
      supergraph: composition.output,
    });
    const result = await execute({ query: planItemsQuery });
    expect(result.errors).toBeUndefined();
    const person = result.data?.PeopleByUserName as {
      Trips?: Array<{ PlanItems?: Array<Record<string, unknown>> }>;
    };
    const items = person?.Trips?.[0]?.PlanItems || [];
    expect(items.length).toBeGreaterThan(0);
    const flight = items.find(i => typeof i.FlightNumber === 'string');
    const event = items.find(i => typeof i.Description === 'string');
    expect(flight?.FlightNumber).toEqual(expect.any(String));
    expect(event?.Description).toEqual(expect.any(String));
  });
});
