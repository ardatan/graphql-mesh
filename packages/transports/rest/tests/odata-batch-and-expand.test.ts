import { buildSchema, execute, parse } from 'graphql';
import { processConnectDirectives } from '../src/directives/connect.js';
import { rebuildOpenInputObjects } from '../src/directives/odataOpenInput.js';

const CONNECTOR_DIRECTIVES = /* GraphQL */ `
  directive @source(name: String!, http: SourceHTTP!, errors: ConnectorErrors) repeatable on SCHEMA
  directive @connect(
    source: String
    http: ConnectHTTP
    selection: String!
    entity: Boolean
  ) repeatable on FIELD_DEFINITION | OBJECT
  directive @key(fields: String!) repeatable on OBJECT

  input SourceHTTP {
    baseURL: String!
    headers: [HTTPHeaderMapping!]
  }
  input ConnectHTTP {
    GET: String
    POST: String
    PATCH: String
    headers: [HTTPHeaderMapping!]
    body: String
  }
  input HTTPHeaderMapping {
    name: String!
    value: String
    from: String
  }
  input ConnectorErrors {
    message: String
  }
`;

const ODATA_ACCEPT = 'application/json;odata.metadata=minimal';

describe('OData expandNavProps request counts', () => {
  const sdl = /* GraphQL */ `
    ${CONNECTOR_DIRECTIVES}

    schema
      @source(
        name: "api"
        http: {
          baseURL: "https://odata.example.com"
          headers: [{ name: "Accept", value: "${ODATA_ACCEPT}" }]
        }
      ) {
      query: Query
    }

    type Query {
      person(userName: String!): Person
        @connect(
          source: "api"
          http: { GET: "/People/{$args.userName}/" }
          selection: "userName: UserName"
        )
    }

    type Person @key(fields: "userName") {
      userName: String
      friends: [Person]
        @connect(
          source: "api"
          http: { GET: "/People/{$this.userName}/Friends" }
          selection: "$.value { userName: UserName }"
        )
      trips: [Trip]
        @connect(
          source: "api"
          http: { GET: "/People/{$this.userName}/Trips" }
          selection: "$.value { id: TripId }"
        )
    }

    type Trip @key(fields: "id") {
      id: Int
    }
  `;

  const query = /* GraphQL */ `
    {
      person(userName: "russellwhyte") {
        userName
        friends {
          userName
        }
        trips {
          id
        }
      }
    }
  `;

  function mockPersonPayload() {
    return {
      UserName: 'russellwhyte',
      Friends: [{ UserName: 'scottketchum' }],
      Trips: [{ TripId: 0 }],
    };
  }

  it('without expandNavProps: parent + each nav = 3 HTTP requests', async () => {
    const urls: string[] = [];
    const schema = processConnectDirectives(buildSchema(sdl), {
      expandNavProps: false,
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        if (String(url).includes('/Friends')) {
          return Response.json({ value: [{ UserName: 'scottketchum' }] });
        }
        if (String(url).includes('/Trips')) {
          return Response.json({ value: [{ TripId: 0 }] });
        }
        return Response.json(mockPersonPayload());
      }) as any,
    });

    const result = await execute({ schema, document: parse(query) });
    expect(result.errors).toBeUndefined();
    expect(urls).toHaveLength(3);
    expect(urls.some(u => u.includes('/Friends'))).toBe(true);
    expect(urls.some(u => u.includes('/Trips'))).toBe(true);
  });

  it('with expandNavProps: single parent HTTP ($expand) — no nav round-trips', async () => {
    const urls: string[] = [];
    const schema = processConnectDirectives(buildSchema(sdl), {
      expandNavProps: true,
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json(mockPersonPayload());
      }) as any,
    });

    const result = await execute({ schema, document: parse(query) });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      person: {
        userName: 'russellwhyte',
        friends: [{ userName: 'scottketchum' }],
        trips: [{ id: 0 }],
      },
    });
    expect(urls).toHaveLength(1);
    const decoded = decodeURIComponent(urls[0]);
    expect(decoded).toMatch(/\$expand=/i);
    expect(decoded).toMatch(/friends/i);
    expect(decoded).toMatch(/trips/i);
  });
});

describe('OData $batch json coalescing', () => {
  it('coalesces sibling nav fetches into one POST /$batch', async () => {
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}

      schema
        @source(
          name: "api"
          http: {
            baseURL: "https://odata.example.com"
            headers: [{ name: "Accept", value: "${ODATA_ACCEPT}" }]
          }
        ) {
        query: Query
      }

      type Query {
        person(userName: String!): Person
          @connect(
            source: "api"
            http: { GET: "/People/{$args.userName}/" }
            selection: "userName: UserName"
          )
      }

      type Person @key(fields: "userName") {
        userName: String
        friends: [Person]
          @connect(
            source: "api"
            http: { GET: "/People/{$this.userName}/Friends" }
            selection: "$.value { userName: UserName }"
          )
        trips: [Trip]
          @connect(
            source: "api"
            http: { GET: "/People/{$this.userName}/Trips" }
            selection: "$.value { id: TripId }"
          )
      }

      type Trip @key(fields: "id") {
        id: Int
      }
    `;

    const urls: string[] = [];
    let batchRequestCount = 0;
    const schema = processConnectDirectives(buildSchema(sdl), {
      expandNavProps: false,
      batch: 'json',
      endpoint: 'https://odata.example.com',
      globalFetch: (async (url: string, init?: RequestInit) => {
        urls.push(String(url));
        if (String(url).includes('/$batch')) {
          const parsed = JSON.parse(String(init?.body));
          batchRequestCount = parsed.requests.length;
          return Response.json({
            responses: parsed.requests.map((req: { id: string; url: string }) => ({
              id: req.id,
              status: 200,
              headers: { 'content-type': 'application/json' },
              body: req.url.includes('Friends')
                ? { value: [{ UserName: 'scottketchum' }] }
                : { value: [{ TripId: 0 }] },
            })),
          });
        }
        // Lone parent fetch is forwarded directly (no /$batch for n===1).
        return Response.json({ UserName: 'russellwhyte' });
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person(userName: "russellwhyte") {
            userName
            friends {
              userName
            }
            trips {
              id
            }
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      person: {
        userName: 'russellwhyte',
        friends: [{ userName: 'scottketchum' }],
        trips: [{ id: 0 }],
      },
    });
    // Tick 1: direct parent GET. Tick 2: one /$batch with friends+trips.
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('/People/russellwhyte');
    expect(urls[1]).toContain('/$batch');
    expect(batchRequestCount).toBe(2);
  });
});

describe('rebuildOpenInputObjects', () => {
  it('flattens rest into the input object for open-type writes', () => {
    const input = {
      UserName: 'alice',
      rest: { customFlag: true, nested: { a: 1 } },
    };
    rebuildOpenInputObjects(input);
    expect(input).toEqual({
      UserName: 'alice',
      customFlag: true,
      nested: { a: 1 },
    });
    expect('rest' in input).toBe(false);
  });

  it('is applied when @connect serializes $args.input bodies', async () => {
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      scalar JSON

      schema
        @source(
          name: "api"
          http: {
            baseURL: "https://odata.example.com"
            headers: [{ name: "Accept", value: "${ODATA_ACCEPT}" }]
          }
        ) {
        query: Query
        mutation: Mutation
      }

      type Query {
        _empty: String
      }

      type Mutation {
        createPerson(input: PersonInput): Person
          @connect(
            source: "api"
            http: { POST: "/People", body: "$args.input" }
            selection: "userName: UserName"
          )
      }

      input PersonInput {
        UserName: String
        rest: JSON
      }

      type Person {
        userName: String
      }
    `;

    let postedBody: string | undefined;
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (_url: string, init?: RequestInit) => {
        postedBody = typeof init?.body === 'string' ? init.body : undefined;
        return Response.json({ UserName: 'alice' });
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        mutation {
          createPerson(input: { UserName: "alice", rest: { customFlag: true } }) {
            userName
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(JSON.parse(postedBody!)).toEqual({
      UserName: 'alice',
      customFlag: true,
    });
  });
});
