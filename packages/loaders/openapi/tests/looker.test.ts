import { join } from 'path';
import { Response } from 'fets';
import { execute, GraphQLSchema, parse } from 'graphql';
import { fakePromise, printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('Looker.4.0.oas', () => {
  const endpoint = 'http://dummy';
  let schema: GraphQLSchema;

  beforeAll(async () => {
    schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: join(__dirname, './fixtures/Looker.4.0.oas.json'),
      ignoreErrorResponses: true,
      endpoint,
      fetch: (url): Promise<Response> => {
        if (url.includes('query_tasks/multi_results')) {
          return fakePromise(
            Response.json({
              url: url,
            }),
          );
        }
        if (url.includes('/queries/slug')) {
          return fakePromise(
            Response.json({
              can: { url },
              id: '1',
              model: 'model',
              view: 'view',
            }),
          );
        }

        return fakePromise(undefined);
      },
    });
  });

  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('Looker.4.0.oas-schema');
  });

  it('should sent comma separated args correctly', async () => {
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          query_task_multi_results(query_task_ids: ["1", "2", "3"])
        }
      `),
    });
    const expectedURL = 'http://dummy/query_tasks/multi_results?query_task_ids=1%2C2%2C3';
    expect(result).toMatchObject({
      data: {
        query_task_multi_results: {
          url: expectedURL,
        },
      },
    });
  });

  it('should parse data correctly for Query_ return type', async () => {
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          query_for_slug(slug: "A") {
            can
            id
            model
            view
          }
        }
      `),
    });
    expect(result).toMatchObject({
      data: {
        query_for_slug: {
          can: {
            url: 'http://dummy/queries/slug/A',
          },
          id: '1',
          model: 'model',
          view: 'view',
        },
      },
    });
  });
});
