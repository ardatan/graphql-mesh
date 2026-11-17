import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildSchema, execute, isObjectType, parse, type GraphQLSchema } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { processConnectDirectives } from '../src/directives/connect.js';

/**
 * Vendored from https://github.com/apollographql/connectors-community (connectors/*).
 * Smoke-load every community schema through Mesh's Connectors executor wiring.
 */
const FIXTURES_ROOT = join(__dirname, 'fixtures/connectors-community');

const CONNECTOR_DIRECTIVES = /* GraphQL */ `
  directive @link(url: String!, import: [String]) repeatable on SCHEMA
  directive @key(fields: String!, resolvable: Boolean) repeatable on OBJECT | INTERFACE
  directive @shareable on FIELD_DEFINITION | OBJECT
  directive @external on FIELD_DEFINITION | OBJECT
  directive @requires(fields: String!) on FIELD_DEFINITION
  directive @provides(fields: String!) on FIELD_DEFINITION
  directive @source(
    name: String!
    http: SourceHTTP!
    errors: ConnectorErrors
    isSuccess: String
  ) repeatable on SCHEMA
  directive @connect(
    source: String
    http: ConnectHTTP
    selection: String!
    entity: Boolean
    errors: ConnectorErrors
    isSuccess: String
  ) repeatable on FIELD_DEFINITION | OBJECT

  input ConnectHTTP {
    GET: String
    HEAD: String
    POST: String
    PUT: String
    PATCH: String
    DELETE: String
    headers: [HTTPHeaderMapping!]
    body: String
    queryParams: String
  }

  input SourceHTTP {
    baseURL: String!
    headers: [HTTPHeaderMapping!]
    queryParams: String
    pathParams: String
    errors: ConnectorErrors
    isSuccess: String
  }

  input HTTPHeaderMapping {
    name: String!
    value: String
    from: String
  }

  input ConnectorErrors {
    message: String
    extensions: String
  }
`;

function walkGraphqlFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkGraphqlFiles(full, acc);
    } else if (entry.endsWith('.graphql')) {
      acc.push(full);
    }
  }
  return acc;
}

function normalizeCommunitySchema(sdl: string): string {
  const match = sdl.match(
    /extend\s+schema([\s\S]*?)(?=\n\s*(?:type|enum|interface|input|scalar|union)\b)/,
  );
  if (!match) {
    return sdl;
  }
  const directives = match[1]
    .split('\n')
    .filter(line => !/^\s*#/.test(line))
    .join('\n')
    .trim();
  const rest = sdl.slice(match.index! + match[0].length);
  const rootOps = [/\btype\s+Query\b/.test(rest) ? '  query: Query' : null]
    .concat(/\btype\s+Mutation\b/.test(rest) ? ['  mutation: Mutation'] : [])
    .filter(Boolean)
    .join('\n');
  return `schema ${directives} {\n${rootOps}\n}\n${rest}`;
}

function buildConnectorsSchema(exampleSdl: string): GraphQLSchema {
  const sdl = `${CONNECTOR_DIRECTIVES}\n${normalizeCommunitySchema(exampleSdl)}`;
  const schema = buildSchema(sdl, { assumeValidSDL: true });
  return processConnectDirectives(schema, {
    globalFetch: (async () => Response.json({})) as any,
  });
}

const communitySchemas = walkGraphqlFiles(FIXTURES_ROOT)
  .map(abs => relative(FIXTURES_ROOT, abs))
  .sort();

describe('connectors-community schemas load on Mesh REST transport', () => {
  it('discovers vendored community fixtures', () => {
    expect(communitySchemas.length).toBeGreaterThan(40);
  });

  it.each(communitySchemas)('loads %s', relativePath => {
    const sdl = readFileSync(join(FIXTURES_ROOT, relativePath), 'utf8');
    const schema = buildConnectorsSchema(sdl);
    const roots = [schema.getQueryType(), schema.getMutationType()].filter(Boolean);
    expect(roots.length).toBeGreaterThan(0);
    // At least one root field should have a @connect resolver wired.
    const withResolver = roots.flatMap(root =>
      Object.values(root!.getFields()).filter(f => typeof f.resolve === 'function'),
    );
    expect(withResolver.length).toBeGreaterThan(0);
  });
});

describe('connectors-community public APIs (mocked HTTP)', () => {
  it('bored: getRandomActivity returns selection fields', async () => {
    const sdl = readFileSync(join(FIXTURES_ROOT, 'bored/bored.graphql'), 'utf8');
    let hit = '';
    const schema = processConnectDirectives(
      buildSchema(`${CONNECTOR_DIRECTIVES}\n${normalizeCommunitySchema(sdl)}`, {
        assumeValidSDL: true,
      }),
      {
        globalFetch: (async (url: string) => {
          hit = String(url);
          return Response.json({
            activity: 'Learn Express.js',
            type: 'education',
            participants: 1,
            price: 0.1,
            link: '',
            key: '3943506',
            accessibility: '0.1',
          });
        }) as any,
      },
    );
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          getRandomActivity {
            activity
            type
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(hit).toContain('bored-api.appbrewery.com');
    expect(result.data).toEqual({
      getRandomActivity: { activity: 'Learn Express.js', type: 'education' },
    });
  });

  it('JSONPlaceholder users: getUser selection mapping', async () => {
    const sdl = readFileSync(join(FIXTURES_ROOT, 'JSONPlaceholder/users.graphql'), 'utf8');
    const schema = processConnectDirectives(
      buildSchema(`${CONNECTOR_DIRECTIVES}\n${normalizeCommunitySchema(sdl)}`, {
        assumeValidSDL: true,
      }),
      {
        globalFetch: (async () =>
          Response.json({
            id: 1,
            name: 'Leanne Graham',
            username: 'Bret',
            email: 'Sincere@april.biz',
            address: {
              street: 'Kulas Light',
              suite: 'Apt. 556',
              city: 'Gwenborough',
              zipcode: '92998-3874',
              geo: { lat: '-37.3159', lng: '81.1496' },
            },
            phone: '1-770-736-8031 x56442',
            website: 'hildegard.org',
            company: {
              name: 'Romaguera-Crona',
              catchPhrase: 'Multi-layered client-server neural-net',
              bs: 'harness real-time e-markets',
            },
          })) as any,
      },
    );
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          getUser(id: "1") {
            id
            name
            username
            email
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      getUser: {
        id: '1',
        name: 'Leanne Graham',
        username: 'Bret',
        email: 'Sincere@april.biz',
      },
    });
  });

  it('apollo-ecomm-simple: products list', async () => {
    const sdl = readFileSync(join(FIXTURES_ROOT, 'apollo-ecomm-simple/connector.graphql'), 'utf8');
    const schema = processConnectDirectives(
      buildSchema(`${CONNECTOR_DIRECTIVES}\n${normalizeCommunitySchema(sdl)}`, {
        assumeValidSDL: true,
      }),
      {
        globalFetch: (async () =>
          Response.json({
            products: [
              { id: '1', name: 'Dune', description: 'A book' },
              { id: '2', name: 'Arrival', description: 'Another book' },
            ],
          })) as any,
      },
    );
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          products {
            id
            name
            description
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect((result.data as any).products).toHaveLength(2);
  });

  it('wires entity resolveReference when entity: true is present', () => {
    const sdl = readFileSync(join(FIXTURES_ROOT, 'JSONPlaceholder/users.graphql'), 'utf8');
    const schema = buildConnectorsSchema(sdl);
    const user = schema.getType('User');
    expect(isObjectType(user)).toBe(true);
    expect(typeof (user as any).resolveReference).toBe('function');
  });
});
