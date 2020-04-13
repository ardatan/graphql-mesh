import { Hooks, KeyValueCache } from '@graphql-mesh/types';
import { printSchema, graphql } from 'graphql';
import handler from '../src';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { addMock, resetMocks, Response } from 'fetchache';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { EventEmitter } from 'events';
declare module 'fetchache' {
  type FetchMockFn = (request: Request) => Promise<Response>;
  function addMock(url: string, mockFn: FetchMockFn): void;
  function resetMocks(): void;
}

const TripPinMetadata = readFileSync(resolve(__dirname, './fixtures/trippin-metadata.xml'), 'utf8');
const PersonMockData = JSON.parse(readFileSync(resolve(__dirname, './fixtures/russellwhyte.json'), 'utf-8'));
const TripMockData = JSON.parse(readFileSync(resolve(__dirname, './fixtures/trip.json'), 'utf-8'));

describe('odata', () => {
  let hooks: Hooks;
  let cache: KeyValueCache;
  beforeEach(() => {
    hooks = new EventEmitter() as Hooks;
    cache = new InMemoryLRUCache();
    resetMocks();
  });
  it('should create a GraphQL schema from a simple OData endpoint', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    expect(printSchema(source.schema)).toMatchSnapshot();
  });
  it('should generate correct HTTP request for requesting an EntitySet', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = 'https://services.odata.org/TripPinRESTierService/People?$select=UserName,FirstName';
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new Response(JSON.stringify({ value: [PersonMockData] }));
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      source: /* GraphQL */ `
        {
          getPeople {
            UserName
            FirstName
          }
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for requesting a single Entity by ID', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People('SOMEID')?$select=UserName,FirstName`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new Response(JSON.stringify(PersonMockData));
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      source: /* GraphQL */ `
        {
          getPeopleByUserName(UserName: "SOMEID") {
            UserName
            FirstName
          }
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for requesting a complex property', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = `https://services.odata.org/TripPinRESTierService/Airports('KSFO')?$select=Location`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new Response(
        JSON.stringify({
          '@odata.type': 'Microsoft.OData.Service.Sample.TrippinInMemory.Models.Airport',
          Location: {
            '@odata.type': 'Microsoft.OData.Service.Sample.TrippinInMemory.Models.AirportLocation',
            Loc: '',
          },
        })
      );
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      source: /* GraphQL */ `
        {
          getAirportsByIcaoCode(IcaoCode: "KSFO") {
            Location {
              Loc
            }
          }
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for query options', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People?$filter=FirstName eq 'Scott'&$select=FirstName`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new Response(JSON.stringify({ value: [PersonMockData] }));
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      source: /* GraphQL */ `
        {
          getPeople(queryOptions: { filter: "FirstName eq 'Scott'" }) {
            FirstName
          }
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for $count', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People/$count`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new Response(JSON.stringify(20));
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      source: /* GraphQL */ `
        {
          getPeopleCount
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for creating an entity', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People`;
    const correctMethod = 'POST';
    const correctBody = {
      UserName: 'lewisblack',
      FirstName: 'Lewis',
      LastName: 'Black',
      Emails: ['lewisblack@example.com'],
      Gender: 'Male',
      FavoriteFeature: 'Feature1',
      Features: [],
      AddressInfo: [
        {
          Address: '187 Suffolk Ln.',
          City: {
            Name: 'Boise',
            CountryRegion: 'United States',
            Region: 'ID',
          },
        },
      ],
    };
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      const bodyObj = JSON.parse(request.body as any);
      bodyObj['@odata.type'] = 'Microsoft.OData.Service.Sample.TrippinInMemory.Models.Person';
      return new Response(JSON.stringify(bodyObj));
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      variableValues: {
        input: correctBody,
      },
      source: /* GraphQL */ `
        mutation CreatePeople($input: PersonInput) {
          createPeople(input: $input) {
            UserName
          }
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
    expect(JSON.parse(sentRequest!.body as any)).toStrictEqual(correctBody);
  });
  it('should generate correct HTTP request for deleting an entity', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People('SOMEID')`;
    const correctMethod = 'DELETE';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new Response(JSON.stringify({}));
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      source: /* GraphQL */ `
        mutation {
          deletePeopleByUserName(UserName: "SOMEID")
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for updating an entity', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People('SOMEID')`;
    const correctMethod = 'PATCH';
    const correctBody = {
      FirstName: 'Mirs',
      LastName: 'King',
    };
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      const returnBody = JSON.parse(request.body as any);
      returnBody['@odata.type'] = 'Microsoft.OData.Service.Sample.TrippinInMemory.Models.Person';
      return new Response(JSON.stringify(returnBody));
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      variableValues: {
        UserName: 'SOMEID',
        input: correctBody,
      },
      source: /* GraphQL */ `
        mutation UpdatePeople($UserName: String!, $input: PeopleUpdateInput!) {
          updatePeopleByUserName(UserName: $UserName, input: $input) {
            FirstName
          }
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
    expect(sentRequest!.body).toBe(JSON.stringify(correctBody));
  });
  it('should generate correct HTTP request for invoking unbound functions', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = `https://services.odata.org/TripPinRESTierService/GetNearestAirport(lat = 33, lon = -118)?$select=Name`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new Response(
        JSON.stringify({
          '@odata.type': 'Microsoft.OData.Service.Sample.TrippinInMemory.Models.Airport',
          Name: 'Name',
        })
      );
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      source: /* GraphQL */ `
        {
          GetNearestAirport(lat: 33, lon: -118) {
            Name
          }
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for invoking bound functions', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People('russellwhyte')/Trip(0)/GetInvolvedPeople?$select=UserName`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(`https://services.odata.org/TripPinRESTierService/People('russellwhyte')?$select=Trips`, async () => {
      return new Response(JSON.stringify(PersonMockData));
    });
    addMock(
      `https://services.odata.org/TripPinRESTierService/People('russellwhyte')/Trips?$filter=TripId eq 0`,
      async () => {
        return new Response(JSON.stringify(TripMockData));
      }
    );
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new Response(JSON.stringify({}));
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      source: /* GraphQL */ `
        {
          getPeopleByUserName(UserName: "russellwhyte") {
            Trips(queryOptions: { filter: "TripId eq 0" }) {
              GetInvolvedPeople {
                UserName
              }
            }
          }
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for invoking unbound actions', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = `https://services.odata.org/TripPinRESTierService/ResetDataSource`;
    const correctMethod = 'POST';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new Response(JSON.stringify(true));
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      source: /* GraphQL */ `
        mutation {
          ResetDataSource
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for invoking bound actions', async () => {
    addMock('https://services.odata.org/TripPinRESTierService/$metadata', async () => new Response(TripPinMetadata));
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People('russellwhyte')/Microsoft.OData.Service.Sample.TrippinInMemory.Models.ShareTrip`;
    const correctMethod = 'POST';
    const correctBody = {
      userName: 'scottketchum',
      tripId: 0,
    };
    let sentRequest: Request;
    addMock(`https://services.odata.org/TripPinRESTierService/People('russellwhyte')`, async () => {
      return new Response(JSON.stringify(PersonMockData));
    });
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new Response(JSON.stringify(true));
    });
    const source = await handler.getMeshSource({
      name: 'TripPin',
      config: {
        baseUrl: 'https://services.odata.org/TripPinRESTierService/',
      },
      hooks,
      cache,
    });

    const graphqlResult = await graphql({
      schema: source.schema,
      source: /* GraphQL */ `
        mutation {
          getPeopleByUserName(UserName: "russellwhyte") {
            ShareTrip(userName: "scottketchum", tripId: 0)
          }
        }
      `,
      contextValue: {},
    });

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
    expect(sentRequest!.body).toBe(JSON.stringify(correctBody));
  });
});
