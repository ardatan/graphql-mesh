import { printSchema } from 'graphql';
import { join } from 'path';
import loadGraphQLSchemaFromOpenAPI from '../src';

describe('Multiple Responses Swagger', () => {
  it('should create correct response types with 204 empty response', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      oasFilePath: join(__dirname, 'fixtures', 'multiple-responses-swagger.yml'),
    });
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "directive @oneOf on INPUT_OBJECT | FIELD_DEFINITION

      type Query {
        \\"\\"\\"Optional extended description in Markdown.\\"\\"\\"
        foo_by_id: foo_by_id_response
      }

      union foo_by_id_response = Foo | Error

      type Foo {
        id: String
      }

      type Error {
        message: String
        stack: String
      }

      type Mutation {
        \\"\\"\\"Optional extended description in Markdown.\\"\\"\\"
        post: post_response
      }

      union post_response = Void_container | Error

      type Void_container {
        Void: Void
      }

      \\"\\"\\"Represents empty values\\"\\"\\"
      scalar Void"
    `);
  });
});
