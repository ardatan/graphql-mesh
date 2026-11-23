import { execute, parse, validate } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Headers, Response, URL } from '@whatwg-node/fetch';
import loadGraphQLSchemaFromOpenAPI from '../src';

describe('Date parameter in header and path', () => {
  it('succeeds', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/date-params.yaml',
      endpoint: 'http://localhost:3000',
      fetch(url, options) {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        const body = options?.body ? JSON.parse(options.body.toString()) : null;
        // Path template values are percent-encoded; decode like a real HTTP server.
        const dateInPathVariable = decodeURIComponent(path.split('/')[3]);
        const headers = new Headers(options?.headers);
        return Response.json({
          success: true,
          pathDate: dateInPathVariable,
          headerDate: headers.get('request-date'),
          bodyDate: body?.eventDate,
          eventName: body?.eventName,
        });
      },
      cwd: __dirname,
    });
    const document = parse(/* GraphQL */ `
      mutation TestDateTime(
        $eventName: String!
        $eventDate: DateTime!
        $dateInPathVariable: DateTime!
        $requestDate: DateTime!
      ) {
        testDateTime(
          input: { eventName: $eventName, eventDate: $eventDate }
          dateInPathVariable: $dateInPathVariable
          request_date: $requestDate
        ) {
          ... on testDateTime_200_response {
            success
            pathDate
            headerDate
            bodyDate
            eventName
          }
        }
      }
    `);
    const eventName = 'Test Event';
    const eventDate = new Date('2024-01-01T00:00:00Z');
    const dateInPathVariable = new Date('2024-01-02T00:00:00Z');
    const requestDate = new Date('2024-01-03T00:00:00Z');
    const validation = validate(schema, document);
    expect(validation).toEqual([]);
    const result = await execute({
      document,
      schema,
      variableValues: {
        eventName,
        eventDate,
        dateInPathVariable,
        requestDate,
      },
    });
    expect(result).toEqual({
      data: {
        testDateTime: {
          success: true,
          pathDate: dateInPathVariable,
          headerDate: requestDate,
          bodyDate: eventDate,
          eventName,
        },
      },
    });
  });

  it('stamps |preEncoded when OpenAPI docs say the path value is URI-encoded', async () => {
    // Wiki-style params document URI-encoded input; others stay Apollo encodeURIComponent.
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
