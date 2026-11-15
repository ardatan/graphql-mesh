import { buildSchema, execute, parse } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { processConnectDirectives } from '../src/directives/connect.js';
import {
  buildConnectPropertyNameMap,
  buildConnectPropertyNameMapTree,
  hasODataMetadataAcceptHeader,
  isODataMetadataAccept,
  splitTopLevelComma,
} from '../src/directives/odataConnectProfile.js';

const CONNECTOR_DIRECTIVES = /* GraphQL */ `
  directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
  directive @connect(
    source: String
    http: ConnectHTTP
    selection: String!
    entity: Boolean
  ) repeatable on FIELD_DEFINITION | OBJECT
  directive @key(fields: String!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE

  input ConnectHTTP {
    GET: String
    headers: [HTTPHeaderMapping!]
  }

  input SourceHTTP {
    baseURL: String!
    headers: [HTTPHeaderMapping!]
  }

  input HTTPHeaderMapping {
    name: String!
    value: String
    from: String
  }
`;

describe('odataConnectProfile helpers', () => {
  it('detects Accept ;odata.metadata=', () => {
    expect(
      isODataMetadataAccept({
        accept: 'application/json;odata.metadata=minimal',
      }),
    ).toBe(true);
    expect(
      isODataMetadataAccept({
        Accept: 'application/json; odata.metadata=full',
      }),
    ).toBe(true);
    expect(isODataMetadataAccept({ accept: 'application/json' })).toBe(false);
  });

  it('detects literal Accept odata.metadata on header mappings', () => {
    expect(
      hasODataMetadataAcceptHeader([
        { name: 'Accept', value: 'application/json;odata.metadata=minimal' },
      ]),
    ).toBe(true);
    expect(hasODataMetadataAcceptHeader([{ name: 'Accept', from: 'accept' }])).toBe(false);
    expect(hasODataMetadataAcceptHeader([{ name: 'Accept', value: 'application/json' }])).toBe(
      false,
    );
  });

  it('maps selection aliases to OData property names', () => {
    const map = buildConnectPropertyNameMap(`
      id
      userName: UserName
      friends {
        id
      }
    `);
    expect(map.get('id')).toBe('id');
    expect(map.get('userName')).toBe('UserName');
    expect(map.get('friends')).toBe('friends');
  });

  it('maps compact single-line selection aliases', () => {
    const map = buildConnectPropertyNameMap('userName: UserName firstName: FirstName');
    expect(map.get('userName')).toBe('UserName');
    expect(map.get('firstName')).toBe('FirstName');
  });

  it('scopes nested property maps so sibling id aliases do not collide', () => {
    const tree = buildConnectPropertyNameMapTree(`
      id: PersonId
      friends {
        id: FriendId
        bestFriend {
          id: BestFriendId
        }
      }
    `);
    expect(tree.map.get('id')).toBe('PersonId');
    expect(tree.children.get('friends')?.map.get('id')).toBe('FriendId');
    expect(tree.children.get('friends')?.children.get('bestFriend')?.map.get('id')).toBe(
      'BestFriendId',
    );
  });

  it('maps $.Wire remaps to the OData wire name (does not invent from the GraphQL alias)', () => {
    const tree = buildConnectPropertyNameMapTree(`
      displayName: $.FirstName
      userName: UserName
    `);
    expect(tree.projectionUnsafe).toBeFalsy();
    expect(tree.map.get('displayName')).toBe('FirstName');
    expect(tree.map.get('userName')).toBe('UserName');
  });

  it('does not mark projection unsafe for __typename / _odataId connector exprs', () => {
    const tree = buildConnectPropertyNameMapTree(`
      __typename: $("Person")
      _odataId: $->get("@odata.id")
      userName: UserName
    `);
    expect(tree.projectionUnsafe).toBeFalsy();
    expect(tree.map.get('userName')).toBe('UserName');
    expect(tree.map.has('__typename')).toBe(false);
    expect(tree.map.has('_odataId')).toBe(false);
  });

  it('marks projection unsafe for non-synthetic $->get remaps', () => {
    const tree = buildConnectPropertyNameMapTree(`
      label: $->get("DisplayName")
      userName: UserName
    `);
    expect(tree.projectionUnsafe).toBe(true);
    expect(tree.map.has('label')).toBe(false);
    expect(tree.map.get('userName')).toBe('UserName');
  });

  it('splits $expand lists without breaking nested $select commas', () => {
    expect(splitTopLevelComma('PlanItems($select=TripId,Name),Friends')).toEqual([
      'PlanItems($select=TripId,Name)',
      'Friends',
    ]);
    expect(splitTopLevelComma('TripId,Name')).toEqual(['TripId', 'Name']);
  });
});

describe('Connect OData $select / $expand', () => {
  it('appends $select/$expand when Accept signals odata.metadata', async () => {
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}

      schema
        @source(
          name: "trippin"
          http: {
            baseURL: "https://odata.example.com"
            headers: [{ name: "Accept", value: "application/json;odata.metadata=minimal" }]
          }
        ) {
        query: Query
      }

      type Query {
        person(userName: String!): Person
          @connect(
            source: "trippin"
            http: { GET: "/People('{$args.userName}')" }
            selection: """
            userName: UserName
            firstName: FirstName
            addressInfo: AddressInfo {
              city: City {
                name: Name
              }
            }
            friends: Friends {
              userName: UserName
            }
            """
          )
      }

      type Person @key(fields: "userName") {
        userName: String
        firstName: String
        addressInfo: [Location]
        friends: [Person]
      }

      type Location {
        city: City
      }

      type City {
        name: String
      }
    `;

    let requestedUrl = '';
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        requestedUrl = String(url);
        return Response.json({
          UserName: 'russellwhyte',
          FirstName: 'Russell',
          AddressInfo: [{ City: { Name: 'Boise' } }],
          Friends: [{ UserName: 'scottketchum' }],
        });
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person(userName: "russellwhyte") {
            userName
            firstName
            addressInfo {
              city {
                name
              }
            }
            friends {
              userName
            }
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    const decoded = decodeURIComponent(requestedUrl);
    // Complex collections (`AddressInfo`) are `$select`ed only; entity nav (`Friends`) `$expand`s.
    expect(decoded).toContain('$select=UserName,FirstName,AddressInfo,Friends');
    expect(decoded).toContain('$expand=Friends($select=UserName)');
    expect(decoded).not.toMatch(/\$expand=[^&]*AddressInfo/);
  });

  it('does not project when Accept has no odata.metadata', async () => {
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}

      schema @source(name: "api", http: { baseURL: "https://api.example.com" }) {
        query: Query
      }

      type Query {
        person(id: ID!): Person
          @connect(source: "api", http: { GET: "/people/{$args.id}" }, selection: "id name")
      }

      type Person {
        id: ID
        name: String
      }
    `;

    let requestedUrl = '';
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        requestedUrl = String(url);
        return Response.json({ id: '1', name: 'Ada' });
      }) as any,
    });

    await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person(id: "1") {
            id
            name
          }
        }
      `),
    });

    expect(requestedUrl).not.toMatch(/\$select/);
    expect(requestedUrl).toBe('https://api.example.com/people/1');
  });

  it('leaves an explicit $select in the path alone', async () => {
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}

      schema
        @source(
          name: "trippin"
          http: {
            baseURL: "https://odata.example.com"
            headers: [{ name: "Accept", value: "application/json;odata.metadata=minimal" }]
          }
        ) {
        query: Query
      }

      type Query {
        person(userName: String!): Person
          @connect(
            source: "trippin"
            http: { GET: "/People('{$args.userName}')?$select=UserName" }
            selection: "userName: UserName firstName: FirstName"
          )
      }

      type Person {
        userName: String
        firstName: String
      }
    `;

    let requestedUrl = '';
    const schema = processConnectDirectives(buildSchema(sdl), {
      globalFetch: (async (url: string) => {
        requestedUrl = String(url);
        return Response.json({ UserName: 'russellwhyte' });
      }) as any,
    });

    await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person(userName: "russellwhyte") {
            userName
            firstName
          }
        }
      `),
    });

    expect(requestedUrl).toContain('$select=UserName');
    expect(requestedUrl).not.toMatch(/FirstName/);
  });

  it('folds queryOptions into $expand when expandNavProps embeds nav', async () => {
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}

      input QueryOptions {
        top: Int
        filter: String
      }

      schema
        @source(
          name: "trippin"
          http: {
            baseURL: "https://odata.example.com"
            headers: [{ name: "Accept", value: "application/json;odata.metadata=minimal" }]
          }
        ) {
        query: Query
      }

      type Query {
        person(userName: String!): Person
          @connect(
            source: "trippin"
            http: { GET: "/People('{$args.userName}')" }
            selection: "userName: UserName"
          )
      }

      type Person @key(fields: "userName") {
        userName: String
        friends(queryOptions: QueryOptions): [Person]
          @connect(
            source: "trippin"
            http: { GET: "/People/{$this.userName}/Friends" }
            selection: "userName: UserName"
          )
      }
    `;

    let requestedUrl = '';
    const schema = processConnectDirectives(buildSchema(sdl), {
      odata: { expandNavProps: true },
      globalFetch: (async (url: string) => {
        requestedUrl = String(url);
        return Response.json({
          UserName: 'russellwhyte',
          Friends: [{ UserName: 'scottketchum' }],
        });
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          person(userName: "russellwhyte") {
            userName
            friends(queryOptions: { top: 2, filter: "UserName ne 'x'" }) {
              userName
            }
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    const decoded = decodeURIComponent(requestedUrl.replace(/\+/g, ' '));
    expect(decoded).toMatch(/\$expand=friends\(\$top=2;\$filter=UserName ne 'x';\$select=/i);
  });

  it('resolves GraphQL variables inside expand queryOptions', async () => {
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}

      input QueryOptions {
        top: Int
      }

      schema
        @source(
          name: "trippin"
          http: {
            baseURL: "https://odata.example.com"
            headers: [{ name: "Accept", value: "application/json;odata.metadata=minimal" }]
          }
        ) {
        query: Query
      }

      type Query {
        person(userName: String!): Person
          @connect(
            source: "trippin"
            http: { GET: "/People('{$args.userName}')" }
            selection: "userName: UserName"
          )
      }

      type Person @key(fields: "userName") {
        userName: String
        friends(queryOptions: QueryOptions): [Person]
          @connect(
            source: "trippin"
            http: { GET: "/People/{$this.userName}/Friends" }
            selection: "userName: UserName"
          )
      }
    `;

    let requestedUrl = '';
    const schema = processConnectDirectives(buildSchema(sdl), {
      odata: { expandNavProps: true },
      globalFetch: (async (url: string) => {
        requestedUrl = String(url);
        return Response.json({
          UserName: 'russellwhyte',
          Friends: [{ UserName: 'scottketchum' }],
        });
      }) as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query ($top: Int!) {
          person(userName: "russellwhyte") {
            userName
            friends(queryOptions: { top: $top }) {
              userName
            }
          }
        }
      `),
      variableValues: { top: 3 },
    });

    expect(result.errors).toBeUndefined();
    const decoded = decodeURIComponent(requestedUrl.replace(/\+/g, ' '));
    expect(decoded).toMatch(/\$expand=friends\(\$top=3;\$select=/i);
  });

  it('prefers parent-expanded nav over a second @connect HTTP fetch when expandNavProps', async () => {
    const sdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}

      schema
        @source(
          name: "trippin"
          http: {
            baseURL: "https://odata.example.com"
            headers: [{ name: "Accept", value: "application/json;odata.metadata=minimal" }]
          }
        ) {
        query: Query
      }

      type Query {
        person(userName: String!): Person
          @connect(
            source: "trippin"
            http: { GET: "/People('{$args.userName}')" }
            selection: "userName: UserName"
          )
      }

      type Person @key(fields: "userName") {
        userName: String
        friends: [Person]
          @connect(
            source: "trippin"
            http: { GET: "/People/{$this.userName}/Friends" }
            selection: "userName: UserName"
          )
      }
    `;

    const urls: string[] = [];
    const schema = processConnectDirectives(buildSchema(sdl), {
      odata: { expandNavProps: true },
      globalFetch: (async (url: string) => {
        urls.push(String(url));
        return Response.json({
          UserName: 'russellwhyte',
          Friends: [{ UserName: 'scottketchum' }],
        });
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
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      person: {
        userName: 'russellwhyte',
        friends: [{ userName: 'scottketchum' }],
      },
    });
    // Parent fetch only — Friends @connect must not fire a second HTTP call.
    expect(urls).toHaveLength(1);
    expect(decodeURIComponent(urls[0])).toMatch(/\$expand=friends/i);
  });
});
