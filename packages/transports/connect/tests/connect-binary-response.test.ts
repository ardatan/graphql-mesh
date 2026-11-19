import { buildSchema, execute, extendSchema, parse } from 'graphql';
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

  it('supports ->split(",", limit) with a quoted comma separator', async () => {
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
              $.csv->split(",", 2)
              """
            )
        }
      `),
      {
        globalFetch: async () =>
          Response.json(
            { csv: 'a,b,c,d' },
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
    // Apollo / JS String.split(sep, limit): at most `limit` pieces; remainder omitted.
    expect(result.data).toEqual({ parts: ['a', 'b'] });
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

  it('multipart File arg named input is not stolen by raw-binary branch', async () => {
    let seenUrl = '';
    let seenPartNames: string[] = [];
    let seenFileBytes: number | null = null;
    let bodyWasFormData = false;
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
          upload(id: String!, input: Upload!): String
            @connect(
              source: "api"
              http: {
                POST: "/upload/{$args.id}"
                body: """
                {
                  "file": $args.input
                }
                """
                headers: [{ name: "Content-Type", value: "multipart/form-data" }]
              }
              selection: "$"
            )
        }
      `),
      {
        globalFetch: async (url: string, init?: RequestInit) => {
          seenUrl = String(url);
          bodyWasFormData = init?.body instanceof FormData;
          const body = init?.body as FormData;
          seenPartNames = body ? [...body.keys()] : [];
          const file = body?.get('file') as File | null;
          seenFileBytes = file ? (await file.arrayBuffer()).byteLength : null;
          return new Response('ok', {
            status: 200,
            headers: { 'content-type': 'text/plain' },
          });
        },
      },
    );

    const file = new File([new Uint8Array([1, 2, 3, 4, 5])], 'input-named.bin', {
      type: 'application/octet-stream',
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        mutation ($id: String!, $input: Upload!) {
          upload(id: $id, input: $input)
        }
      `),
      variableValues: { id: 'path-1', input: file },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ upload: 'ok' });
    expect(seenUrl).toContain('/upload/path-1');
    // Prefer duck-typing: `@whatwg-node/fetch` FormData may not be `instanceof` global FormData.
    expect(bodyWasFormData || seenPartNames.length > 0).toBe(true);
    expect(seenPartNames).toEqual(['file']);
    expect(seenFileBytes).toBe(5);
  });

  it('multipart $args.input nested File is not structuredClone-destroyed', async () => {
    let seenFileBytes: number | null = null;
    const schema = processDirectives(
      buildSchema(/* GraphQL */ `
        ${CONNECTOR_DIRECTIVES}
        schema @source(name: "api", http: { baseURL: "http://localhost" }) {
          query: Query
          mutation: Mutation
        }
        scalar Upload
        input UploadInput {
          note: String
          file: Upload!
        }
        type Query {
          noop: String
        }
        type Mutation {
          upload(input: UploadInput!): String
            @connect(
              source: "api"
              http: {
                POST: "/upload"
                body: "$args.input"
                headers: [{ name: "Content-Type", value: "multipart/form-data" }]
              }
              selection: "$"
            )
        }
      `),
      {
        globalFetch: async (_url: string, init?: RequestInit) => {
          const body = init?.body as FormData;
          const file = body.get('file') as File;
          seenFileBytes = file ? (await file.arrayBuffer()).byteLength : null;
          return new Response('ok', {
            status: 200,
            headers: { 'content-type': 'text/plain' },
          });
        },
      },
    );

    const file = new File([new Uint8Array([9, 8, 7])], 'nested.bin', {
      type: 'application/octet-stream',
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        mutation ($input: UploadInput!) {
          upload(input: $input)
        }
      `),
      variableValues: { input: { note: 'hi', file } },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ upload: 'ok' });
    expect(seenFileBytes).toBe(3);
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

  it('reprocess preserves root @connect wrapper and still wires Reference.resource', async () => {
    const urls: string[] = [];
    const schemaSdl = /* GraphQL */ `
      ${CONNECTOR_DIRECTIVES}
      schema @source(name: "fhir", http: { baseURL: "http://localhost" }) {
        query: Query
      }
      type Query {
        observationById(id: String!): Observation
          @connect(
            source: "fhir"
            http: { GET: "/Observation/{$args.id}" }
            selection: """
            id
            subject {
              reference
            }
            """
            entity: true
          )
      }
      type Observation {
        id: String
        subject: Reference
      }
      type Reference {
        reference: String
      }
      type Patient {
        id: String
        family: String
      }
    `;
    let schema = processDirectives(buildSchema(schemaSdl), {
      globalFetch: async (url: string) => {
        urls.push(String(url));
        if (String(url).includes('/Observation/')) {
          return Response.json(
            { id: 'obs-1', subject: { reference: 'Patient/p-1' } },
            { status: 200 },
          );
        }
        if (String(url).includes('/Patient/')) {
          return Response.json({ id: 'p-1', name: [{ family: 'Doe' }] }, { status: 200 });
        }
        return new Response('not found', { status: 404 });
      },
    });

    // Simulate wrapSchema / rename proxy on the root connector.
    const query = schema.getQueryType()!;
    const rootField = query.getFields().observationById;
    const originalRootResolve = rootField.resolve!;
    let wrapperHits = 0;
    rootField.resolve = (root, args, context, info) => {
      wrapperHits++;
      // Rename proxy would map public arg → source name; here just pass through.
      return originalRootResolve(root, args, context, info);
    };

    // Merge-style additionalTypeDefs: Reference.resource @connect (legacy Mesh path).
    schema = extendSchema(
      schema,
      parse(/* GraphQL */ `
        extend type Reference {
          resource: Patient
            @connect(
              source: "fhir"
              http: { GET: """/Patient/{$this.reference->split("/")->get(1)}""" }
              selection: """
              id
              """
            )
        }
      `),
    );

    // Second pass — must keep the root wrapper and install Reference.resource.
    schema = processDirectives(schema, {
      preserveExistingFieldResolvers: true,
      globalFetch: async (url: string) => {
        urls.push(String(url));
        if (String(url).includes('/Observation/')) {
          return Response.json(
            { id: 'obs-1', subject: { reference: 'Patient/p-1' } },
            { status: 200 },
          );
        }
        if (String(url).includes('/Patient/')) {
          return Response.json({ id: 'p-1' }, { status: 200 });
        }
        return new Response('not found', { status: 404 });
      },
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          observationById(id: "obs-1") {
            id
            subject {
              reference
              resource {
                id
              }
            }
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(wrapperHits).toBeGreaterThan(0);
    expect(result.data).toEqual({
      observationById: {
        id: 'obs-1',
        subject: {
          reference: 'Patient/p-1',
          resource: { id: 'p-1' },
        },
      },
    });
    expect(urls.some(u => u.includes('/Observation/obs-1'))).toBe(true);
    expect(urls.some(u => u.includes('/Patient/p-1'))).toBe(true);
  });
});
