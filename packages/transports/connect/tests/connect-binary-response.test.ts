import { buildSchema, execute, parse } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { processDirectives } from '../src/directives/process.js';

const CONNECTOR_DIRECTIVES = /* GraphQL */ `
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

describe('Connectors non-JSON responses (Apollo parity)', () => {
  it('maps image/png (and other non-text) responses to null without UTF-8 decoding', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
    const schema = processDirectives(
      buildSchema(/* GraphQL */ `
        ${CONNECTOR_DIRECTIVES}
        schema @source(name: "api", http: { baseURL: "http://localhost" }) {
          query: Query
        }
        type Query {
          render: String @connect(source: "api", http: { GET: "/png" }, selection: "$")
        }
      `),
      {
        globalFetch: async () =>
          new Response(pngBytes, {
            status: 200,
            headers: { 'content-type': 'image/png' },
          }),
      },
    );

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          render
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ render: null });
  });

  it('supports Apollo string ->split for FHIR Type/id references', async () => {
    const schema = processDirectives(
      buildSchema(/* GraphQL */ `
        ${CONNECTOR_DIRECTIVES}
        schema @source(name: "api", http: { baseURL: "http://localhost" }) {
          query: Query
        }
        type Query {
          subjectId: String
            @connect(
              source: "api"
              http: { GET: "/obs" }
              selection: """
              $.subject.reference->split("/")->get(1)
              """
            )
        }
      `),
      {
        globalFetch: async () =>
          Response.json(
            { subject: { reference: 'Patient/nhanes-112200' } },
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      },
    );

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          subjectId
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ subjectId: 'nhanes-112200' });
  });

  it('maps text/plain responses to the literal string (Apollo `$` text)', async () => {
    const schema = processDirectives(
      buildSchema(/* GraphQL */ `
        ${CONNECTOR_DIRECTIVES}
        schema @source(name: "api", http: { baseURL: "http://localhost" }) {
          query: Query
        }
        type Query {
          note: String @connect(source: "api", http: { GET: "/note" }, selection: "$")
        }
      `),
      {
        globalFetch: async () =>
          new Response('hello plain', {
            status: 200,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          }),
      },
    );

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          note
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ note: 'hello plain' });
  });
});
