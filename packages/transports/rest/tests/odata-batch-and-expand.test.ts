import { buildSchema, execute, parse } from 'graphql';
import { processConnectDirectives } from '../src/directives/connect.js';
import { createODataBatchFetch } from '../src/directives/odataBatch.js';
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
    queryParams: String
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
      odata: { expandNavProps: false },
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
      odata: { expandNavProps: true },
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
      odata: {
        expandNavProps: false,
        batch: 'json',
      },
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

  it('splits /$batch by Ocp-Apim-Subscription-Key like Authorization', async () => {
    const batchKeys: string[] = [];
    const fetchFn = (async (url: string, init?: RequestInit) => {
      if (!String(url).includes('/$batch')) {
        return Response.json({ ok: true });
      }
      const headerBag = init?.headers as Record<string, string>;
      batchKeys.push(
        headerBag?.['Ocp-Apim-Subscription-Key'] || headerBag?.['ocp-apim-subscription-key'] || '',
      );
      const parsed = JSON.parse(String(init?.body));
      return Response.json({
        responses: parsed.requests.map((req: { id: string }) => ({
          id: req.id,
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { ok: true },
        })),
      });
    }) as any;

    const batchFetch = createODataBatchFetch({
      fetchFn,
      endpoint: 'https://odata.example.com',
      batchMode: 'json',
    });
    const context = {};
    await Promise.all([
      batchFetch(
        'https://odata.example.com/A',
        { headers: { 'Ocp-Apim-Subscription-Key': 'key-a' } },
        context,
      ),
      batchFetch(
        'https://odata.example.com/B',
        { headers: { 'Ocp-Apim-Subscription-Key': 'key-b' } },
        context,
      ),
      batchFetch(
        'https://odata.example.com/C',
        { headers: { 'Ocp-Apim-Subscription-Key': 'key-a' } },
        context,
      ),
      batchFetch(
        'https://odata.example.com/D',
        { headers: { 'Ocp-Apim-Subscription-Key': 'key-b' } },
        context,
      ),
    ]);
    expect(batchKeys.sort()).toEqual(['key-a', 'key-b']);
  });

  it('partitions multipart /$batch by configured securityHeaderNames (x-session)', async () => {
    const batchSessions: string[] = [];
    const fetchFn = (async (url: string, init?: RequestInit) => {
      if (!String(url).includes('/$batch')) {
        return Response.json({ ok: true });
      }
      const headerBag = init?.headers as Record<string, string>;
      batchSessions.push(headerBag?.['x-session'] || headerBag?.['X-Session'] || '');
      // multipart body — return a minimal multipart with one part per request
      const body = String(init?.body || '');
      const n = (body.match(/Content-ID:/g) || []).length || 1;
      let response = '';
      const boundary = 'batchresponse_test';
      for (let i = 0; i < n; i++) {
        response += `--${boundary}\r\nContent-Type: application/http\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{"ok":true}\r\n`;
      }
      response += `--${boundary}--\r\n`;
      return new Response(response, {
        headers: { 'content-type': `multipart/mixed;boundary=${boundary}` },
      });
    }) as any;

    const batchFetch = createODataBatchFetch({
      fetchFn,
      endpoint: 'https://odata.example.com',
      batchMode: 'multipart',
      securityHeaderNames: ['x-session'],
    });
    const context = {};
    await Promise.all([
      batchFetch('https://odata.example.com/A', { headers: { 'x-session': 's-a' } }, context),
      batchFetch('https://odata.example.com/B', { headers: { 'x-session': 's-b' } }, context),
      batchFetch('https://odata.example.com/C', { headers: { 'x-session': 's-a' } }, context),
      batchFetch('https://odata.example.com/D', { headers: { 'x-session': 's-b' } }, context),
    ]);
    expect(batchSessions.sort()).toEqual(['s-a', 's-b']);
  });

  it('isolates partition failures so other auth groups still succeed', async () => {
    const fetchFn = (async (url: string, init?: RequestInit) => {
      if (!String(url).includes('/$batch')) {
        return Response.json({ ok: true });
      }
      const headerBag = init?.headers as Record<string, string>;
      const auth = headerBag?.Authorization || headerBag?.authorization || '';
      if (auth === 'Bearer bad') {
        throw new Error('upstream batch denied');
      }
      const parsed = JSON.parse(String(init?.body));
      return Response.json({
        responses: parsed.requests.map((req: { id: string }) => ({
          id: req.id,
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { ok: true },
        })),
      });
    }) as any;

    const batchFetch = createODataBatchFetch({
      fetchFn,
      endpoint: 'https://odata.example.com',
      batchMode: 'json',
    });
    const context = {};
    const results = await Promise.allSettled([
      batchFetch(
        'https://odata.example.com/A',
        { headers: { Authorization: 'Bearer bad' } },
        context,
      ),
      batchFetch(
        'https://odata.example.com/B',
        { headers: { Authorization: 'Bearer bad' } },
        context,
      ),
      batchFetch(
        'https://odata.example.com/C',
        { headers: { Authorization: 'Bearer good' } },
        context,
      ),
      batchFetch(
        'https://odata.example.com/D',
        { headers: { Authorization: 'Bearer good' } },
        context,
      ),
    ]);
    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('fulfilled');
    expect(results[3].status).toBe('fulfilled');
  });

  it('splits /$batch by Authorization so different credentials never share a batch', async () => {
    const batchPosts: Array<{ auth: string; urls: string[] }> = [];
    const fetchFn = (async (url: string, init?: RequestInit) => {
      if (!String(url).includes('/$batch')) {
        return Response.json({ ok: true });
      }
      const headerBag =
        init?.headers && typeof init.headers === 'object' && !Array.isArray(init.headers)
          ? (init.headers as Record<string, string>)
          : {};
      const auth =
        headerBag.Authorization ||
        headerBag.authorization ||
        new Headers(init?.headers as HeadersInit).get('authorization') ||
        '';
      const parsed = JSON.parse(String(init?.body));
      batchPosts.push({
        auth,
        urls: parsed.requests.map((req: { url: string }) => req.url),
      });
      return Response.json({
        responses: parsed.requests.map((req: { id: string }) => ({
          id: req.id,
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { ok: true },
        })),
      });
    }) as any;

    const batchFetch = createODataBatchFetch({
      fetchFn,
      endpoint: 'https://odata.example.com',
      batchMode: 'json',
    });

    const context = {};
    // Two requests per tenant so both partitions use /$batch (n===1 is forwarded).
    await Promise.all([
      batchFetch(
        'https://odata.example.com/A',
        { headers: { Authorization: 'Bearer tenant-a' } },
        context,
      ),
      batchFetch(
        'https://odata.example.com/B',
        { headers: { Authorization: 'Bearer tenant-b' } },
        context,
      ),
      batchFetch(
        'https://odata.example.com/C',
        { headers: { Authorization: 'Bearer tenant-a' } },
        context,
      ),
      batchFetch(
        'https://odata.example.com/D',
        { headers: { Authorization: 'Bearer tenant-b' } },
        context,
      ),
    ]);

    expect(batchPosts).toHaveLength(2);
    const byAuth = Object.fromEntries(batchPosts.map(p => [p.auth, p.urls.sort()]));
    expect(byAuth['Bearer tenant-a']).toEqual(['/A', '/C']);
    expect(byAuth['Bearer tenant-b']).toEqual(['/B', '/D']);
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

  it('preserves scalar rest fields used by non-OData REST inputs', () => {
    const input = { rest: 'pause', id: 1 };
    rebuildOpenInputObjects(input);
    expect(input).toEqual({ rest: 'pause', id: 1 });
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

describe('OData path encode mix (_odataId raw, args encoded)', () => {
  it('keeps _odataId unencoded while encoding sibling {$args} in absolute templates', async () => {
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
        person: Person
          @connect(
            source: "api"
            http: { GET: "/People/root" }
            selection: "userName: UserName"
          )
      }

      type Person {
        userName: String
        item(id: String!): Item
          @connect(
            source: "api"
            http: { GET: "{$this._odataId}/Items('{$args.id}')" }
            selection: "name: Name"
          )
      }

      type Item {
        name: String
      }
    `;

    const urls: string[] = [];
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        if (String(url).includes('/People/root')) {
          return Response.json({
            UserName: 'x',
            '@odata.id': 'https://odata.example.com/People/a b',
          });
        }
        return Response.json({ Name: 'n' });
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person {
            userName
            item(id: "a/b?x=1") {
              name
            }
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    const follow = urls.find(u => u.includes('/Items('));
    expect(follow).toBeTruthy();
    // Args stay percent-encoded as one segment; `_odataId` is not left unencoded as a
    // break-out (URL serializers may turn spaces into %20 after template resolve).
    expect(follow!).toContain(encodeURIComponent('a/b?x=1'));
    expect(follow!).not.toContain("/Items('a/b?x=1')");
    expect(decodeURIComponent(follow!.replace(/\+/g, ' '))).toContain(
      'https://odata.example.com/People/a b/Items(',
    );
  });
});

describe('prefer-embedded completes _odataId for already-mapped nav', () => {
  it('fills nested _odataId on mapped expand payloads without rematching', async () => {
    const { ensureODataIdField } = await import('../src/directives/connect.js');
    const mapped = [
      { __typename: 'Order', id: 'o1' },
      { __typename: 'Order', id: 'o2', '@odata.id': 'https://odata.example.com/Orders/o2' },
    ];
    const out = ensureODataIdField(mapped, mapped, 'https://odata.example.com/People/p/Orders');
    expect(out[0]._odataId).toBe('https://odata.example.com/People/p/Orders/o1');
    expect(out[1]._odataId).toBe('https://odata.example.com/Orders/o2');
  });

  it('remaps nav when parent selection is raw `$` (does not mark pass-through children)', async () => {
    // Parent `$` returns raw Orders; marker must not tag those items or prefer-embedded
    // skips `name: Name` and GraphQL sees name: null.
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
        person(id: String!): Person
          @connect(
            source: "api"
            http: { GET: "/People/{$args.id}" }
            selection: "$"
          )
      }

      type Person @key(fields: "id") {
        id: String
        orders: [Order]
          @connect(
            source: "api"
            http: { GET: "/People/{$this.id}/Orders" }
            selection: "$.value { id name: Name }"
          )
      }

      type Order @key(fields: "id") {
        id: String
        name: String
      }
    `;

    const urls: string[] = [];
    const schema = processConnectDirectives(buildSchema(sdl), {
      odata: { expandNavProps: true },
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json({
          id: 'p1',
          Orders: [{ id: 'o1', Name: 'One' }],
        });
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person(id: "p1") {
            id
            orders {
              id
              name
            }
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      person: {
        id: 'p1',
        orders: [{ id: 'o1', name: 'One' }],
      },
    });
    expect(urls).toHaveLength(1);
  });

  it('marks nested nav under hand-written `$.person` root wrappers', async () => {
    // `$.person { orders: Orders { … } }` must unwrap like `$.value` so nestedMappedSelections
    // records `orders` (not `person`); otherwise rematch can null already-mapped fields.
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
        person(id: String!): Person
          @connect(
            source: "api"
            http: { GET: "/People/{$args.id}" }
            selection: """
              $.person {
                id
                orders: Orders {
                  id
                  name: Name
                }
              }
            """
          )
      }

      type Person @key(fields: "id") {
        id: String
        orders: [Order]
          @connect(
            source: "api"
            http: { GET: "/People/{$this.id}/Orders" }
            selection: "$.value { id name: Name }"
          )
      }

      type Order @key(fields: "id") {
        id: String
        name: String
      }
    `;

    const urls: string[] = [];
    const schema = processConnectDirectives(buildSchema(sdl), {
      odata: { expandNavProps: true },
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json({
          person: {
            id: 'p1',
            Orders: [{ id: 'o1', Name: 'One' }],
          },
        });
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person(id: "p1") {
            id
            orders {
              id
              name
            }
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      person: {
        id: 'p1',
        orders: [{ id: 'o1', name: 'One' }],
      },
    });
    expect(urls).toHaveLength(1);
  });

  it('keeps parent-mapped nested orders without rematch wiping name', async () => {
    // Explicit `orders: Orders { id name: Name }` must stay marked so rematch is skipped.
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
        person(id: String!): Person
          @connect(
            source: "api"
            http: { GET: "/People/{$args.id}" }
            selection: """
              id
              orders: Orders {
                id
                name: Name
              }
            """
          )
      }

      type Person @key(fields: "id") {
        id: String
        orders: [Order]
          @connect(
            source: "api"
            http: { GET: "/People/{$this.id}/Orders" }
            selection: "$.value { id name: Name }"
          )
      }

      type Order @key(fields: "id") {
        id: String
        name: String
      }
    `;

    const urls: string[] = [];
    const schema = processConnectDirectives(buildSchema(sdl), {
      odata: { expandNavProps: true },
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json({
          id: 'p1',
          Orders: [{ id: 'o1', Name: 'One' }],
        });
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person(id: "p1") {
            id
            orders {
              id
              name
            }
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      person: {
        id: 'p1',
        orders: [{ id: 'o1', name: 'One' }],
      },
    });
    expect(urls).toHaveLength(1);
  });

  it('still maps top-level remaps when only nested aliases match raw keys', async () => {
    // Nested `id: Id` must not prove the outer order is already mapped — otherwise
    // `name: Name` / `customer: Customer` never run and GraphQL sees nulls.
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
        person(id: String!): Person
          @connect(
            source: "api"
            http: { GET: "/People/{$args.id}" }
            selection: "id"
          )
      }

      type Person @key(fields: "id") {
        id: String
        orders: [Order]
          @connect(
            source: "api"
            http: { GET: "/People/{$this.id}/Orders" }
            selection: "$.value { id name: Name customer: Customer { id: Id } }"
          )
      }

      type Order @key(fields: "id") {
        id: String
        name: String
        customer: Customer
      }

      type Customer @key(fields: "id") {
        id: String
      }
    `;

    const urls: string[] = [];
    const schema = processConnectDirectives(buildSchema(sdl), {
      odata: { expandNavProps: true },
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json({
          id: 'p1',
          Orders: [{ id: 'o1', Name: 'One', Customer: { Id: 'c1' } }],
        });
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person(id: "p1") {
            id
            orders {
              id
              name
              customer {
                id
              }
            }
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      person: {
        id: 'p1',
        orders: [{ id: 'o1', name: 'One', customer: { id: 'c1' } }],
      },
    });
    expect(urls).toHaveLength(1);
  });
});

describe('OData parameter alias query encoding', () => {
  it('JSON-encodes @colors as one array value (not repeated params)', async () => {
    const urls: string[] = [];
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
        paint(colors: [String!]!): String
          @connect(
            source: "api"
            http: {
              GET: "/Paint(colors=@colors)"
              queryParams: "{ \\"@colors\\": $args.colors }"
            }
            selection: "$"
          )
      }
    `;

    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json('ok');
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          paint(colors: ["red", "blue"])
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(urls).toHaveLength(1);
    const u = new URL(urls[0]);
    const raw = u.searchParams.get('@colors');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual(['red', 'blue']);
    // Not repeat-style `@colors=red&@colors=blue`
    expect(u.searchParams.getAll('@colors')).toHaveLength(1);
  });
});
