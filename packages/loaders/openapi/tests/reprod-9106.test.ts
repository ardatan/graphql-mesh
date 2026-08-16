import type { GraphQLSchema } from 'graphql';
import { execute, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '@omnigraph/openapi';

describe('Reproduction #9106', () => {
  let createdSchema: GraphQLSchema;
  let lastRequest: { url: string; contentType: string | null; body: string } | undefined;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/reprod-9106.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
      async fetch(url, init) {
        lastRequest = {
          url: String(url),
          contentType: new Headers(init?.headers).get('content-type'),
          body: typeof init?.body === 'string' ? init.body : String(init?.body ?? ''),
        };
        return Response.json({
          access_token: 'token',
          expires_in: 3600,
          token_type: 'Bearer',
        });
      },
    });
  });
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('reprod-9106');
  });
  it('serializes discriminator oneOf bodies as form-urlencoded when that content type is listed first', async () => {
    lastRequest = undefined;
    const result = await execute({
      schema: createdSchema,
      document: parse(/* GraphQL */ `
        mutation {
          post_token(
            input: {
              OAuth_Client_Credentials_Request_Input: {
                grant_type: client_credentials
                client_id: "id"
                client_secret: "secret"
              }
            }
          ) {
            ... on Provider_specific_Access_Token_Response {
              access_token
            }
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(lastRequest?.contentType).toBe('application/x-www-form-urlencoded');
    expect(lastRequest?.body).toContain('grant_type=client_credentials');
    expect(lastRequest?.body).toContain('client_id=id');
    expect(lastRequest?.body).toContain('client_secret=secret');
    expect(lastRequest?.body).not.toContain('OAuth_Client_Credentials_Request_Input');
  });
});
