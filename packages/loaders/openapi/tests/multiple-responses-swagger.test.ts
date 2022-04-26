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
        users: users_response
      }

      union users_response = Void_container | Error

      type Void_container {
        Void: Void
      }

      \\"\\"\\"Represents empty values\\"\\"\\"
      scalar Void

      type Error {
        message: String
        stack: String
      }"
    `);
  });
});
