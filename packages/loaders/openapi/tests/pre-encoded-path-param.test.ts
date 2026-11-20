import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('pre-encoded path params', () => {
  it('stamps |preEncoded when OpenAPI docs say the path value is URI-encoded', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('WikiTitles', {
      endpoint: 'http://localhost:3000',
      source: {
        openapi: '3.0.0',
        info: { title: 'WikiTitles', version: '1.0.0' },
        paths: {
          '/page/{article}': {
            get: {
              operationId: 'getArticle',
              parameters: [
                {
                  name: 'article',
                  in: 'path',
                  required: true,
                  description:
                    'The title of any article. It also should be URI-encoded, so that non-URI-safe characters like %, / or ? are accepted. Example: Are_You_the_One%3F',
                  schema: { type: 'string' },
                },
              ],
              responses: {
                '200': {
                  description: 'ok',
                  content: {
                    'text/plain': {
                      schema: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          '/pet/{petId}': {
            get: {
              operationId: 'getPet',
              parameters: [
                {
                  name: 'petId',
                  in: 'path',
                  required: true,
                  description: 'Pet id (raw, not URI-encoded)',
                  schema: { type: 'string' },
                },
              ],
              responses: {
                '200': {
                  description: 'ok',
                  content: {
                    'application/json': {
                      schema: { type: 'object', properties: { name: { type: 'string' } } },
                    },
                  },
                },
              },
            },
          },
        },
      } as any,
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toMatch(/GET:\s*"\/page\/\{\$args\.article\|preEncoded\}"/);
    expect(sdl).toMatch(/GET:\s*"\/pet\/\{\$args\.petId\}"/);
    expect(sdl).not.toMatch(/petId\|preEncoded/);
  });
});
