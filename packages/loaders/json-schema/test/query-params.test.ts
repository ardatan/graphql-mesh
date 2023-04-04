import { execute, OperationTypeNode, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromJSONSchemas } from '../src/loadGraphQLSchemaFromJSONSchemas';

describe('Query Params', () => {
  it('queryParamsSample with invalid param names', async () => {
    const schema = await loadGraphQLSchemaFromJSONSchemas('test', {
      endpoint: 'http://localhost:3000',
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'test',
          path: '/test',
          method: 'GET',
          queryParamsSample: {
            'foo:bar': 'baz',
          },
        },
      ],
      async fetch(url) {
        return Response.json(decodeURIComponent(url.split('?')[1]));
      },
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('queryParamsSample');
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          test(foo_bar: "baz")
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(result).toEqual({
      data: {
        test: 'foo:bar=baz',
      },
    });
  });
});
