import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { OperationTypeNode } from 'graphql';
import loadGraphQLSchemaFromJSONSchemas from '../src';

describe('Integration', () => {
  it('should handle circular dependencies', async () => {
    const schema = await loadGraphQLSchemaFromJSONSchemas('test', {
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'book',
          path: '/book',
          responseSchema: './fixtures/book.json#/definitions/Book',
        },
      ],
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchInlineSnapshot(`
      "schema {
        query: Query
      }

      type Query {
        book: Book
      }

      type Book {
        title: String
        author: String
        price: Float
        similarBooks: [SimilarBook]
      }

      type SimilarBook {
        title: String
        author: String
        price: Float
        similarBooks: [SimilarBook]
      }"
    `);
  });
});
