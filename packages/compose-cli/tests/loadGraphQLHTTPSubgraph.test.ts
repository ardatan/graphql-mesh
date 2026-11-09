import {
  buildASTSchema,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  introspectionFromSchema,
  parse,
  printSchema,
} from 'graphql';
import type { MeshFetch } from '@graphql-mesh/types';
import { fakePromise } from '@whatwg-node/promise-helpers';
import { dummyLogger as log } from '../../testing/dummyLogger';
import { fixExtends, loadGraphQLHTTPSubgraph } from '../src/loadGraphQLHTTPSubgraph';

describe('loadGraphQLHTTPSubgraph', () => {
  it('respects schemaHeaders in introspection query', async () => {
    const fetchFn = jest.fn<Promise<Response>, Parameters<MeshFetch>>(() =>
      fakePromise(
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
    const { schema$ } = loader({ fetch: fetchFn, cwd: __dirname, log });
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

  describe('fixExtends', () => {
    it('keeps root Query extensions so subgraph fields are not overwritten', () => {
      const document = fixExtends(
        parse(/* GraphQL */ `
          type Author @key(fields: "id") {
            id: ID!
            name: String!
          }

          type Query {
            authors: [Author]
            author(id: ID!): Author
          }

          type _Service {
            sdl: String
          }

          scalar _Any

          union _Entity = Author

          extend type Query {
            _entities(representations: [_Any!]!): [_Entity]!
            _service: _Service!
          }
        `),
      );
      const schema = buildASTSchema(document, {
        assumeValidSDL: true,
        assumeValid: true,
      });
      expect(Object.keys(schema.getQueryType()!.getFields())).toEqual(
        expect.arrayContaining(['authors', 'author', '_entities', '_service']),
      );
    });

    it('drops empty Apollo 2.15 stubs next to extended entity types', () => {
      const document = fixExtends(
        parse(/* GraphQL */ `
          extend type Product @key(fields: "upc") {
            upc: String! @external
            inStock: Boolean
          }

          type Product
        `),
      );
      const schema = buildASTSchema(document, {
        assumeValidSDL: true,
        assumeValid: true,
      });
      expect(Object.keys((schema.getType('Product') as GraphQLObjectType).getFields())).toEqual([
        'upc',
        'inStock',
      ]);
    });
  });
});
