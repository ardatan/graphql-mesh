import { buildSchema, execute, parse } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { processConnectDirectives } from '../src/directives/connect.js';
import {
  buildConnectPropertyNameMap,
  hasODataMetadataAcceptHeader,
  isODataMetadataAccept,
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
    expect(
      hasODataMetadataAcceptHeader([{ name: 'Accept', value: 'application/json' }]),
    ).toBe(false);
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
