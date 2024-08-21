import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  introspectionFromSchema,
  printSchema,
} from 'graphql';
import type { MeshFetch } from '@graphql-mesh/types';
import { DefaultLogger } from '@graphql-mesh/utils';
import { loadGraphQLHTTPSubgraph } from '../src/loadGraphQLHTTPSubgraph';

describe('loadGraphQLHTTPSubgraph', () => {
  it('respects schemaHeaders in introspection query', async () => {
    const fetchFn = jest.fn<Promise<Response>, Parameters<MeshFetch>>(() =>
      Promise.resolve(
        Response.json({
          data: introspectionFromSchema(
            new GraphQLSchema({
              query: new GraphQLObjectType({
                name: 'Query',
                fields: {
                  foo: {
                    type: GraphQLString,
                  },
                },
              }),
            }),
          ),
        }),
      ),
    );
    const loader = loadGraphQLHTTPSubgraph('TEST', {
      endpoint: 'http://test.com',
      schemaHeaders: {
        'x-token': 'reallysafe',
      },
    });
    const { schema$ } = loader({ fetch: fetchFn, cwd: __dirname, logger: new DefaultLogger() });
    const schema = await schema$;
    expect(printSchema(schema)).toContain(
      /* GraphQL */ `
type Query {
  foo: String
}
`.trim(),
    );
    expect(fetchFn.mock.calls[0][1]).toMatchObject({
      headers: {
        'x-token': 'reallysafe',
      },
    });
  });
});
