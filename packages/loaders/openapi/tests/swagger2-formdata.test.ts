import { createRouter, Response } from 'fets';
import { execute, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('Swagger 2 formData → @connect http.body', () => {
  it('emits form-urlencoded Content-Type and body selection from flat args', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('wiki', {
      source: './fixtures/swagger2-formdata.yml',
      endpoint: 'http://localhost:3000',
      cwd: __dirname,
      fetch: (async () => Response.json({ ok: true })) as any,
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toContain('application/x-www-form-urlencoded');
    expect(sdl).toContain('q: $args.q');
    expect(sdl).toContain('checkMath');
  });

  it('POSTs form fields in the request body', async () => {
    let seenContentType: string | null = null;
    let seenBody = '';
    const server = createRouter().route({
      method: 'POST',
      path: '/media/math/check/:type',
      async handler(req) {
        seenContentType = req.headers.get('content-type');
        seenBody = await req.text();
        return Response.json({
          contentType: seenContentType,
          body: seenBody,
        });
      },
    });

    const schema = await loadGraphQLSchemaFromOpenAPI('wiki', {
      source: './fixtures/swagger2-formdata.yml',
      endpoint: 'http://localhost:3000',
      cwd: __dirname,
      fetch: server.fetch as any,
    });

    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        mutation Check($type: String!, $q: String!) {
          checkMath(type: $type, q: $q) {
            contentType
            body
          }
        }
      `),
      variableValues: { type: 'tex', q: 'E=mc^2' },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      checkMath: {
        contentType: 'application/x-www-form-urlencoded',
        body: 'q=E%3Dmc%5E2',
      },
    });
    expect(seenContentType).toContain('application/x-www-form-urlencoded');
    expect(seenBody).toBe('q=E%3Dmc%5E2');
  });
});
