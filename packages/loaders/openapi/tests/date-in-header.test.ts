import { execute, parse, validate } from 'graphql';
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
        const dateInPathVariable = path.split('/')[3];
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
});
