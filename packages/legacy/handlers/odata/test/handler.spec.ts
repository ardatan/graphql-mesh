import { GraphQLInterfaceType, parse, type ExecutionResult } from 'graphql';
// eslint-disable-next-line import/no-extraneous-dependencies
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { fs, path } from '@graphql-mesh/cross-helpers';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import type { KeyValueCache, MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { normalizedExecutor } from '@graphql-tools/executor';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { dummyLogger as logger } from '../../../../testing/dummyLogger.js';
import ODataHandler from '../src/index.js';
import { addMock, mockFetch, MockResponse, resetMocks } from './custom-fetch.js';

const TripPinMetadata = fs.readFileSync(
  path.resolve(__dirname, './fixtures/trippin-metadata.xml'),
  'utf8',
);
const PersonMockData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, './fixtures/russellwhyte.json'), 'utf-8'),
);
const SimplePersonMockData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, './fixtures/alice.json'), 'utf-8'),
);
const TripMockData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, './fixtures/trip.json'), 'utf-8'),
);
const BasicMetadata = fs.readFileSync(
  path.resolve(__dirname, './fixtures/simple-metadata.xml'),
  'utf-8',
);
const BoundActionMetadata = fs.readFileSync(
  path.resolve(__dirname, './fixtures/bound-action.xml'),
  'utf-8',
);

const baseDir = __dirname;
const importFn = (id: string) => require(id);

describe('odata', () => {
  let pubsub: MeshPubSub;
  let store: MeshStore;
  beforeEach(() => {
    pubsub = new PubSub();
    store = new MeshStore('odata', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    resetMocks();
  });
  it('should create a GraphQL schema from a simple OData endpoint', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });
    expect(printSchemaWithDirectives(source.schema)).toMatchSnapshot();
  });
  it('should create correct GraphQL schema for functions with entity set paths', async () => {
    using cache = new InMemoryLRUCache();
    addMock('http://sample.service.com/$metadata', async () => new MockResponse(BasicMetadata));
    const handler = new ODataHandler({
      name: 'SampleService',
      config: {
        endpoint: 'http://sample.service.com',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });
    expect(printSchemaWithDirectives(source.schema)).toMatchSnapshot();
  });
  it('should create correct GraphQL schema for actions bound to entity set', async () => {
    using cache = new InMemoryLRUCache();
    addMock(
      'http://sample.service.com/$metadata',
      async () => new MockResponse(BoundActionMetadata),
    );
    const handler = new ODataHandler({
      name: 'SampleService',
      config: {
        endpoint: 'http://sample.service.com',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });
    expect(printSchemaWithDirectives(source.schema)).toMatchSnapshot();
  });
  it('should declare arguments for fields created from bound functions', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });
    const personType = source.schema.getType('IPerson') as GraphQLInterfaceType;
    const getFriendsTripsFunction = personType.getFields().GetFriendsTrips;
    expect(getFriendsTripsFunction.args).toHaveLength(2);
    const personArg = getFriendsTripsFunction.args.find(arg => arg.name === 'person');
    expect(personArg).not.toBeFalsy();
    expect(personArg.type.toString()).toBe('PersonInput');
    const userNameArg = getFriendsTripsFunction.args.find(arg => arg.name === 'userName');
    expect(userNameArg).not.toBeFalsy();
    expect(userNameArg.type.toString()).toBe('String!');
  });
  it('should generate correct HTTP request for requesting an EntitySet', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = 'https://services.odata.org/TripPinRESTierService/People';
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(JSON.stringify({ value: [PersonMockData] }));
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        {
          People {
            UserName
            FirstName
          }
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for requesting a single Entity by ID', async () => {
    using cache = new InMemoryLRUCache();
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People/SOMEID/`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(JSON.stringify(PersonMockData));
    });
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        {
          PeopleByUserName(UserName: "SOMEID") {
            UserName
            FirstName
          }
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for requesting a complex property', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/Airports/KSFO/?$select=IcaoCode,Location`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(
        JSON.stringify({
          '@odata.type': 'Microsoft.OData.Service.Sample.TrippinInMemory.Models.Airport',
          IcaoCode: Date.now().toString(),
          Location: {
            '@odata.type': 'Microsoft.OData.Service.Sample.TrippinInMemory.Models.AirportLocation',
            Loc: '',
          },
        }),
      );
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        {
          AirportsByIcaoCode(IcaoCode: "KSFO") {
            IcaoCode
            Location {
              Loc
            }
          }
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for query options', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People?$filter=FirstName eq 'Scott'`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(JSON.stringify({ value: [PersonMockData] }));
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        {
          People(queryOptions: { filter: "FirstName eq 'Scott'" }) {
            UserName
            FirstName
          }
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(decodeURIComponent(sentRequest!.url)).toBe(decodeURIComponent(correctUrl));
  });
  it('should generate correct HTTP request for $count', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People/$count`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(JSON.stringify(20));
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        {
          PeopleCount
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for creating an entity', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People`;
    const correctMethod = 'POST';
    const correctBody = {
      UserName: 'lewisblack',
      FirstName: 'Lewis',
      LastName: 'Black',
      Emails: ['lewisblack@example.com'],
      Gender: 'Male',
      FavoriteFeature: 'Feature1',
      Features: ['Feature1', 'Feature2'],
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
    let sentRequest: any;
    addMock(correctUrl, async request => {
      sentRequest = request.clone();
      const bodyObj: any = await request.json();
      bodyObj['@odata.type'] = 'Microsoft.OData.Service.Sample.TrippinInMemory.Models.Person';
      return new MockResponse(JSON.stringify(bodyObj));
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      variableValues: {
        input: correctBody,
      },
      document: parse(/* GraphQL */ `
        mutation CreatePeople($input: PersonInput) {
          createPeople(input: $input) {
            UserName
          }
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
    expect(await sentRequest!.json()).toMatchObject(correctBody);
  });
  it('should generate correct HTTP request for deleting an entity', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People/SOMEID/`;
    const correctMethod = 'DELETE';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(JSON.stringify({}));
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        mutation {
          deletePeopleByUserName(UserName: "SOMEID")
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for updating an entity', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People/SOMEID/`;
    const correctMethod = 'PATCH';
    const correctBody = {
      FirstName: 'Mirs',
      LastName: 'King',
    };
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request.clone() as Request;
      const returnBody: any = await request.json();
      returnBody['@odata.type'] = 'Microsoft.OData.Service.Sample.TrippinInMemory.Models.Person';
      return new MockResponse(JSON.stringify(returnBody));
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      variableValues: {
        UserName: 'SOMEID',
        input: correctBody,
      },
      document: parse(/* GraphQL */ `
        mutation UpdatePeople($UserName: String!, $input: PersonUpdateInput!) {
          updatePeopleByUserName(UserName: $UserName, input: $input) {
            FirstName
          }
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
    expect(await sentRequest!.text()).toBe(JSON.stringify(correctBody));
  });
  it('should generate correct HTTP request for invoking unbound functions', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/GetNearestAirport(lat = 33, lon = -118)?$select=IcaoCode,Name`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(
        JSON.stringify({
          '@odata.type': 'Microsoft.OData.Service.Sample.TrippinInMemory.Models.Airport',
          IcaoCode: Date.now().toString(),
          Name: 'Name',
        }),
      );
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        {
          GetNearestAirport(lat: 33, lon: -118) {
            IcaoCode
            Name
          }
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(decodeURIComponent(sentRequest!.url)).toBe(correctUrl);
  });
  it('should generate correct HTTP request for invoking bound functions', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People/russellwhyte/Trips/0/Microsoft.OData.Service.Sample.TrippinInMemory.Models.GetInvolvedPeople?$select=UserName`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(`https://services.odata.org/TripPinRESTierService/People/russellwhyte/`, async () => {
      return new MockResponse(JSON.stringify(PersonMockData));
    });
    addMock(
      `https://services.odata.org/TripPinRESTierService/People/russellwhyte/Trips?$filter=TripId eq 0&$select=TripId`,
      async () => {
        return new MockResponse(JSON.stringify(TripMockData));
      },
    );
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(
        JSON.stringify({
          value: [],
        }),
      );
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        {
          PeopleByUserName(UserName: "russellwhyte") {
            UserName
            Trips(queryOptions: { filter: "TripId eq 0" }) {
              TripId
              GetInvolvedPeople {
                UserName
              }
            }
          }
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for invoking bound functions with arguments', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People/russellwhyte/Microsoft.OData.Service.Sample.TrippinInMemory.Models.GetFriendsTrips(userName='ronaldmundy')?$select=TripId,Name`;
    const correctMethod = 'GET';
    let sentRequest: Request;
    addMock(`https://services.odata.org/TripPinRESTierService/People/russellwhyte/`, async () => {
      return new MockResponse(JSON.stringify(PersonMockData));
    });
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(
        JSON.stringify({
          value: [],
        }),
      );
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        {
          PeopleByUserName(UserName: "russellwhyte") {
            UserName
            GetFriendsTrips(userName: "ronaldmundy") {
              TripId
              Name
            }
          }
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url.replace(/'/g, '%27')).toBe(correctUrl.replace(/'/g, '%27')); // apostrophe gets percent-encoded
  });
  it('should generate correct HTTP request for invoking unbound actions', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/ResetDataSource`;
    const correctMethod = 'POST';
    let sentRequest: Request;
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(JSON.stringify(true));
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        mutation {
          ResetDataSource
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
  });
  it('should generate correct HTTP request for invoking bound actions', async () => {
    addMock(
      'https://services.odata.org/TripPinRESTierService/$metadata',
      async () => new MockResponse(TripPinMetadata),
    );
    const correctUrl = `https://services.odata.org/TripPinRESTierService/People/russellwhyte/Microsoft.OData.Service.Sample.TrippinInMemory.Models.ShareTrip`;
    const correctMethod = 'POST';
    const correctBody = {
      userName: 'scottketchum',
      tripId: 0,
    };
    let sentRequest: Request;
    addMock(`https://services.odata.org/TripPinRESTierService/People/russellwhyte/`, async () => {
      return new MockResponse(JSON.stringify(PersonMockData));
    });
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(JSON.stringify(true));
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'TripPin',
      config: {
        endpoint: 'https://services.odata.org/TripPinRESTierService',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        mutation {
          PeopleByUserName(UserName: "russellwhyte") {
            ShareTrip(userName: "scottketchum", tripId: 0)
          }
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
    expect(await sentRequest!.text()).toBe(JSON.stringify(correctBody));
  });
  it('should generate correct HTTP request for invoking action bound to entity set', async () => {
    addMock(
      'https://sample.service.com/$metadata',
      async () => new MockResponse(BoundActionMetadata),
    );
    const correctUrl = `https://sample.service.com/People/alice/Sample.Service.SendMessage`;
    const correctMethod = 'POST';
    const correctBody = {
      UserName: 'bob',
      Message: 'hello',
    };
    let sentRequest: Request;
    addMock(`https://sample.service.com/People/alice/?$select=UserName`, async () => {
      return new MockResponse(JSON.stringify(SimplePersonMockData));
    });
    addMock(correctUrl, async request => {
      sentRequest = request;
      return new MockResponse(JSON.stringify(true));
    });
    using cache = new InMemoryLRUCache();
    const handler = new ODataHandler({
      name: 'Sample.Service',
      config: {
        endpoint: 'https://sample.service.com/',
      },
      pubsub,
      cache,
      store,
      baseDir,
      importFn,
      logger,
    });
    const source = await handler.getMeshSource({
      fetchFn: mockFetch,
    });

    const graphqlResult = (await normalizedExecutor({
      schema: source.schema,
      contextValue: {},
      document: parse(/* GraphQL */ `
        mutation {
          PeopleByUserName(UserName: "alice") {
            SendMessage(UserName: "bob", Message: "hello")
          }
        }
      `),
    })) as ExecutionResult;

    expect(graphqlResult.errors).toBeFalsy();
    expect(sentRequest!.method).toBe(correctMethod);
    expect(sentRequest!.url).toBe(correctUrl);
    expect(await sentRequest!.text()).toBe(JSON.stringify(correctBody));
  });
});
