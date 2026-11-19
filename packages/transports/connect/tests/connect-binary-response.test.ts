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

  it('keeps empty unsupported MIME as "" for String! (nonempty PNG still null)', async () => {
    const schema = processDirectives(
      buildSchema(/* GraphQL */ `
        ${CONNECTOR_DIRECTIVES}
        schema @source(name: "api", http: { baseURL: "http://localhost" }) {
          query: Query
        }
        type Query {
          emptyHtml: String! @connect(source: "api", http: { GET: "/empty" }, selection: "$")
        }
      `),
      {
        globalFetch: async () =>
          new Response(null, {
            status: 204,
            headers: { 'content-type': 'text/html' },
          }),
      },
    );

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          emptyHtml
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ emptyHtml: '' });
  });

  it('preserves quoted commas in ->split separator args', async () => {
    const schema = processDirectives(
      buildSchema(/* GraphQL */ `
        ${CONNECTOR_DIRECTIVES}
        schema @source(name: "api", http: { baseURL: "http://localhost" }) {
          query: Query
        }
        type Query {
          parts: [String]
            @connect(
              source: "api"
              http: { GET: "/csv" }
              selection: """
              $.csv->split(",")
              """
            )
        }
      `),
      {
        globalFetch: async () =>
          Response.json(
            { csv: 'a,b,c' },
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      },
    );

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          parts
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ parts: ['a', 'b', 'c'] });
  });

  it('encodes FHIR Type/id path segments separately (literal / between)', async () => {
    let seenUrl = '';
    const schema = processDirectives(
      buildSchema(/* GraphQL */ `
        ${CONNECTOR_DIRECTIVES}
        schema @source(name: "api", http: { baseURL: "http://localhost" }) {
          query: Query
        }
        type Query {
          resource(reference: String!): String
            @connect(
              source: "api"
              http: {
                GET: "/{$args.reference->split(\\"/\\")->get(0)}/{$args.reference->split(\\"/\\")->get(1)}"
              }
              selection: "$"
            )
        }
      `),
      {
        globalFetch: async (url: string) => {
          seenUrl = String(url);
          return new Response('ok', {
            status: 200,
            headers: { 'content-type': 'text/plain' },
          });
        },
      },
    );

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          resource(reference: "Patient/16020")
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ resource: 'ok' });
    expect(seenUrl).toBe('http://localhost/Patient/16020');
  });

  it('evaluates virtual selection method chains (split/get)', async () => {
    const schema = processDirectives(
      buildSchema(/* GraphQL */ `
        ${CONNECTOR_DIRECTIVES}
        schema @source(name: "api", http: { baseURL: "http://localhost" }) {
          query: Query
        }
        type Query {
          patientId(ref: String!): String
            @connect(selection: "$args.ref->split(\\"/\\")->get(1)")
        }
      `),
    );

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          patientId(ref: "Patient/nhanes-112200")
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ patientId: 'nhanes-112200' });
  });

  it('multipart form parts honor http.body map keys and live file values', async () => {
    let seenPartNames: string[] = [];
    let seenFileBytes: number | null = null;
    const schema = processDirectives(
      buildSchema(/* GraphQL */ `
        ${CONNECTOR_DIRECTIVES}
        schema @source(name: "api", http: { baseURL: "http://localhost" }) {
          query: Query
          mutation: Mutation
        }
        scalar Upload
        type Query {
          noop: String
        }
        type Mutation {
          upload(id: String!, user_file: Upload!): String
            @connect(
              source: "api"
              http: {
                POST: "/upload/{$args.id}"
                body: """
                {
                  "user-file": $args.user_file
                }
                """
                headers: [{ name: "Content-Type", value: "multipart/form-data" }]
              }
              selection: "$"
            )
        }
      `),
      {
        globalFetch: async (_url: string, init?: RequestInit) => {
          const body = init?.body as FormData;
          seenPartNames = [...body.keys()];
          const file = body.get('user-file') as File;
          seenFileBytes = file ? (await file.arrayBuffer()).byteLength : null;
          return new Response('uploaded', {
            status: 200,
            headers: { 'content-type': 'text/plain' },
          });
        },
      },
    );

    const file = new File([new Uint8Array([1, 2, 3, 4])], 'note.bin', {
      type: 'application/octet-stream',
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        mutation ($id: String!, $user_file: Upload!) {
          upload(id: $id, user_file: $user_file)
        }
      `),
      variableValues: { id: 'abc', user_file: file },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ upload: 'uploaded' });
    expect(seenPartNames).toEqual(['user-file']);
    expect(seenFileBytes).toBe(4);
  });
});
