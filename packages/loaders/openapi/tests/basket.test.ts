import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Headers } from '@whatwg-node/fetch';
import { execute, parse } from 'graphql';
import loadGraphQLSchemaFromOpenAPI, { createBundle } from '../src';

describe('Basket', () => {
  it('should generate the correct bundle', async () => {
    const bundle = await createBundle('basket', {
      source: './fixtures/basket.json',
      cwd: __dirname,
    });
    expect(bundle).toMatchSnapshot();
  });
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('basket', {
      source: './fixtures/basket.json',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
  it('user can override accept value defined by the schema', async () => {
    const providedAccept = 'application/random+json';
    let givenHeader: string;
    const schema = await loadGraphQLSchemaFromOpenAPI('basket', {
      source: './fixtures/basket.json',
      cwd: __dirname,
      operationHeaders: {
        accept: providedAccept,
      },
      async fetch(input, init) {
        const headers = new Headers(init?.headers);
        givenHeader = headers.get('accept');
        return new Response(
          JSON.stringify({
            random: 2,
          })
        );
      },
    });
    await execute({
      schema,
      document: parse(/* GraphQL */ `
        mutation {
          post_basket(input: "test") {
            __typename
          }
        }
      `),
    });
    expect(givenHeader).toBe(providedAccept);
  });
});
