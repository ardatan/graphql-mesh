import { Response, type OpenAPIDocument } from 'fets';
import { assertObjectType, execute, getNamedType, parse, printSchema } from 'graphql';
import loadGraphQLSchemaFromOpenAPI from '@omnigraph/openapi';

describe('Reproductions', () => {
  it('should not parse if the source returns null for an URL field', async () => {
    const oas: OpenAPIDocument = {
      paths: {
        '/test': {
          get: {
            operationId: 'test',
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: {
                      title: 'Test',
                      type: 'object',
                      properties: {
                        nullUrl: {
                          type: 'string',
                          example: 'http://example.com',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: 'http://localhost:3000/openapi.json',
      endpoint: 'http://localhost:3000',
      fetch(url) {
        if (url === 'http://localhost:3000/openapi.json') {
          return Response.json(oas);
        }
        if (url === 'http://localhost:3000/test') {
          return Response.json({ nullUrl: null });
        }
        return new Response(null, { status: 404 });
      },
    });
    const testType = assertObjectType(schema.getType('Test'));
    const fields = testType.getFields();
    expect(fields).toHaveProperty('nullUrl');
    const namedType = getNamedType(fields.nullUrl.type);
    expect(namedType.name).toBe('URL');
    const query = /* GraphQL */ `
      query Test {
        test {
          nullUrl
        }
      }
    `;
    const result = await execute({
      schema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        test: {
          nullUrl: null,
        },
      },
    });
  });
});
