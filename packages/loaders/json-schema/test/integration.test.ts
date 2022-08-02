import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { OperationTypeNode } from 'graphql';
import loadGraphQLSchemaFromJSONSchemas, { createBundle } from '../src';

describe('Integration', () => {
  it('should handle circular dependencies while creating a GraphQLSchema', async () => {
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
  it('should handle circular dependencies while generating a bundle', async () => {
    const bundle = await createBundle('test', {
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
    console.log(bundle.referencedSchema.definitions.SimilarBook.properties);
    // Make sure it doesn't have circular dependencies so it can be serialized with JSON.stringify
    expect(JSON.stringify(bundle)).toMatchInlineSnapshot(
      `"{\\"name\\":\\"test\\",\\"operations\\":[{\\"type\\":\\"query\\",\\"field\\":\\"book\\",\\"path\\":\\"/book\\",\\"responseSchema\\":\\"./fixtures/book.json#/definitions/Book\\"}],\\"referencedSchema\\":{\\"$ref\\":\\"#/definitions/_schema\\",\\"definitions\\":{\\"_schema\\":{\\"type\\":\\"object\\",\\"title\\":\\"_schema\\",\\"properties\\":{\\"query\\":{\\"$ref\\":\\"#/definitions/Query\\"},\\"queryInput\\":{\\"$ref\\":\\"#/definitions/QueryInput\\"}},\\"required\\":[\\"query\\"]},\\"Query\\":{\\"type\\":\\"object\\",\\"title\\":\\"Query\\",\\"properties\\":{\\"book\\":{\\"$ref\\":\\"#/definitions/Book\\"}}},\\"Book\\":{\\"type\\":\\"object\\",\\"properties\\":{\\"title\\":{\\"type\\":\\"string\\"},\\"author\\":{\\"type\\":\\"string\\"},\\"price\\":{\\"type\\":\\"number\\"},\\"similarBooks\\":{\\"type\\":\\"array\\",\\"items\\":{\\"$ref\\":\\"#/definitions/SimilarBook\\"}}},\\"$resolvedRef\\":\\"/definitions/Book\\",\\"title\\":\\"Book\\"},\\"SimilarBook\\":{\\"type\\":\\"object\\",\\"properties\\":{\\"title\\":{\\"type\\":\\"string\\"},\\"author\\":{\\"type\\":\\"string\\"},\\"price\\":{\\"type\\":\\"number\\"},\\"similarBooks\\":{\\"type\\":\\"array\\",\\"items\\":{\\"$ref\\":\\"#/definitions/SimilarBook\\"}}},\\"$resolvedRef\\":\\"/definitions/SimilarBook\\",\\"title\\":\\"SimilarBook\\"},\\"QueryInput\\":{\\"type\\":\\"object\\",\\"title\\":\\"QueryInput\\",\\"additionalProperties\\":true}}}}"`
    );
  });
});
