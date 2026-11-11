import { buildSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { createFilterTransform } from '../../src/transforms/filter-schema.js';
import { createHoistFieldTransform } from '../../src/transforms/hoist-field.js';
import {
  applyHoistAliasToConnectSelection,
  stripFieldsFromConnectSelection,
} from '../../src/transforms/utils.js';

describe('Connectors selection rewrite helpers', () => {
  it('stripFieldsFromConnectSelection removes top-level picks', () => {
    expect(stripFieldsFromConnectSelection('id name email', new Set(['email', 'secret']))).toBe(
      'id name',
    );
  });

  it('applyHoistAliasToConnectSelection appends path alias', () => {
    expect(
      applyHoistAliasToConnectSelection('id profile { name }', ['profile', 'name'], 'name'),
    ).toBe('id profile { name }\nname: profile.name');
  });
});

describe('filter + hoist Connectors selection integration', () => {
  const directives = /* GraphQL */ `
    directive @link(url: String!, import: [String]) repeatable on SCHEMA
    directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
    directive @connect(
      source: String
      http: ConnectHTTP
      selection: String!
    ) repeatable on FIELD_DEFINITION
    directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION

    input ConnectHTTP {
      GET: String
    }
    input SourceHTTP {
      baseURL: String!
    }
  `;

  it('filter strips inaccessible fields from @connect selection', () => {
    const schema = buildSchema(/* GraphQL */ `
      ${directives}
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "rest", http: { baseURL: "https://api.example.com" }) {
        query: Query
      }
      type Query {
        user: User @connect(source: "rest", http: { GET: "/user" }, selection: "id name email")
      }
      type User {
        id: ID!
        name: String
        email: String
      }
    `);
    const filter = createFilterTransform({
      filters: ['User.!email'],
    });
    const next = filter(schema, { name: 'rest', schema } as any);
    const printed = printSchemaWithDirectives(next);
    expect(printed).toContain('selection:');
    expect(printed).not.toMatch(/selection:\s*"id name email"/);
    expect(printed).toMatch(/selection:\s*"id name"/);
  });

  it('hoist appends selection alias for Connectors return types', () => {
    const schema = buildSchema(/* GraphQL */ `
      ${directives}
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "rest", http: { baseURL: "https://api.example.com" }) {
        query: Query
      }
      type Query {
        user: User
          @connect(source: "rest", http: { GET: "/user" }, selection: "id profile { name }")
      }
      type User {
        id: ID!
        profile: Profile
      }
      type Profile {
        name: String
      }
    `);
    const hoist = createHoistFieldTransform({
      mapping: [
        {
          typeName: 'User',
          pathConfig: ['profile', 'name'],
          newFieldName: 'name',
        },
      ],
    });
    const next = hoist(schema, { name: 'rest', schema } as any);
    const printed = printSchemaWithDirectives(next);
    expect(printed).toContain('name: profile.name');
  });
});
