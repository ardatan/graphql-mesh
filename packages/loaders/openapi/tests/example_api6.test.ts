import { execute, GraphQLSchema, parse, validate } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import type { OpenAPILoaderOptions } from '../src/index.js';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';
import { exampleApi6 } from './example_api6_server.js';

describe('example_api6', () => {
  /**
   * Set up the schema first and run example API server
   */
  let createdSchema: GraphQLSchema;
  const endpoint = 'http://localhost:3000/api';
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api6', {
      fetch: exampleApi6.fetch as any,
      endpoint,
      source: './fixtures/example_oas6.json',
      cwd: __dirname,
    });
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  it('Option requestOptions should work with links', async () => {
    // Verifying the behavior of the link by itself
    const query1 = /* GraphQL */ `
      {
        object {
          object2Link {
            data
          }
          withParameter: object2Link(specialheader: "extra data") {
            data
          }
        }
      }
    `;

    const promise1 = execute({
      schema: createdSchema,
      document: parse(query1),
    });

    const query2 = /* GraphQL */ `
      {
        object {
          object2Link {
            data
          }
        }
      }
    `;

    const options: OpenAPILoaderOptions = {
      endpoint,
      source: './fixtures/example_oas6.json',
      cwd: __dirname,
      fetch: exampleApi6.fetch as any,
      operationHeaders: {
        specialheader: 'requestOptions',
      },
    };

    const promise2 = loadGraphQLSchemaFromOpenAPI('example_api6', options).then(schema => {
      const ast = parse(query2);
      const errors = validate(schema, ast);
      expect(errors).toEqual([]);
      return execute({
        schema,
        document: ast,
      });
    });

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1.errors).toBeFalsy();

    expect(result1.data).toEqual({
      object: {
        object2Link: {
          data: 'object2',
        },
        withParameter: {
          data: "object2 with special header: 'extra data'",
        },
      },
    });

    expect(result2.errors).toBeFalsy();

    expect(result2).toEqual({
      data: {
        object: {
          object2Link: {
            data: "object2 with special header: 'requestOptions'", // Data from requestOptions in a link
          },
        },
      },
    });
  });

  // Simple scalar fields on the request body
  it('Simple request body using application/x-www-form-urlencoded', async () => {
    const query = /* GraphQL */ `
      mutation {
        post_formUrlEncoded(input: { name: "Mittens", status: "healthy", weight: 6 }) {
          name
          status
          weight
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      post_formUrlEncoded: {
        name: 'Mittens',
        status: 'healthy',
        weight: 6,
      },
    });
  });

  /**
   * The field 'previousOwner' should be desanitized to 'previous_owner'
   *
   * Status is a required field so it is also included
   */
  it('Request body using application/x-www-form-urlencoded and desanitization of field name', async () => {
    const query = /* GraphQL */ `
      mutation {
        post_formUrlEncoded(input: { previous_owner: "Martin", status: "healthy" }) {
          previous_owner
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      post_formUrlEncoded: {
        previous_owner: 'Martin',
      },
    });
  });

  /**
   * The field 'history' is an object
   *
   * Status is a required field so it is also included
   */
  it('Request body using application/x-www-form-urlencoded containing object', async () => {
    const query = /* GraphQL */ `
      mutation {
        post_formUrlEncoded(input: { history: { data: "Friendly" }, status: "healthy" }) {
          history {
            data
          }
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      post_formUrlEncoded: {
        history: {
          data: 'Friendly',
        },
      },
    });
  });

  it('Request body using application/x-www-form-urlencoded containing object with no properties', async () => {
    const query = /* GraphQL */ `
      mutation {
        post_formUrlEncoded(input: { history2: { data: "Friendly" }, status: "healthy" }) {
          history2
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      post_formUrlEncoded: {
        history2: {
          data: 'Friendly',
        },
      },
    });
  });

  /**
   * '/cars/{id}' should create a 'cars_by_id' field
   *
   * Also the path parameter just contains the term 'id'
   */
  it('inferResourceNameFromPath() field with simple plural form', async () => {
    const query = /* GraphQL */ `
      {
        cars_by_id(id: "Super Speed")
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      cars_by_id: 'Car ID: Super Speed',
    });
  });

  //
  /**
   * '/cacti/{cactusId}' should create an 'cacti_by_cactusId' field
   *
   * Also the path parameter is the combination of the singular form and 'id'
   */
  it('inferResourceNameFromPath() field with irregular plural form', async () => {
    const query = /* GraphQL */ `
      {
        cacti_by_cactusId(cactusId: "Spikey")
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      cacti_by_cactusId: 'Cactus ID: Spikey',
    });
  });

  /**
   * '/eateries/{eatery}/breads/{breadName}/dishes/{dishKey}/ should create an
   * 'eateryBreadDish' field
   *
   * The path parameters are the singular form, some combination with the term
   * 'name', and some combination with the term 'key'
   */
  it('inferResourceNameFromPath() field with long path', async () => {
    const query = /* GraphQL */ `
      {
        eateries_by_eatery_breads_by_breadName_dishes_by_dishKey(
          eatery: "Mike's"
          breadName: "challah"
          dishKey: "bread pudding"
        )
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      eateries_by_eatery_breads_by_breadName_dishes_by_dishKey:
        "Parameters combined: Mike's challah bread pudding",
    });
  });

  /**
   * '/nestedReferenceInParameter' contains a query parameter 'russianDoll' that
   * contains reference to a component schema.
   */
  it('Nested reference in parameter schema', async () => {
    const query = /* GraphQL */ `
      {
        nestedReferenceInParameter(
          russianDoll: {
            name: "Gertrude"
            nestedDoll: { name: "Tatiana", nestedDoll: { name: "Lidia" } }
          }
        )
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      nestedReferenceInParameter: 'Gertrude, Tatiana, Lidia',
    });
  });

  /**
   * 'POST inputUnion' has a request body that contains a oneOf. The request body
   * will be converted into an input object type while the oneOf will be turned
   * into a union type. However, according to the spec, input object types cannot
   * be composed of unions. We create an input type with `@oneOf` directive which
   * annotates that type as an input union.
   */
  it('Input object types composed of union types should default to arbitrary JSON type', async () => {
    const query = /* GraphQL */ `
      {
        __type(name: "Mutation") {
          fields {
            name
            args {
              name
              type {
                name
              }
            }
          }
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(
      (result.data.__type as any).fields.find(
        (field: { name: string }) => field.name === 'post_inputUnion',
      ),
    ).toEqual({
      name: 'post_inputUnion',
      args: [
        {
          name: 'input',
          type: {
            name: 'post_inputUnion_request_Input',
          },
        },
      ],
    });
  });

  /**
   * GET /strictGetOperation should not receive a Content-Type header
   */
  it('Get operation should not receive Content-Type', async () => {
    const query = /* GraphQL */ `
      {
        strictGetOperation
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      strictGetOperation: 'Perfect!',
    });
  });

  /**
   * GET /noResponseSchema does not have a response schema
   */
  it('Handle no response schema', async () => {
    const query = /* GraphQL */ `
      {
        noResponseSchema
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      noResponseSchema: 'Hello world',
    });
  });

  /**
   * GET /testLinkWithNonStringParam has a link object that has a non-string
   * parameter
   */
  it('Handle no response schema', async () => {
    const query = /* GraphQL */ `
      {
        testLinkWithNonStringParam {
          hello
          return5
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      testLinkWithNonStringParam: {
        hello: 'world',
        return5: 5,
      },
    });
  });

  /**
   * GET /testLinkwithNestedParam has a link object that has a nested
   * parameter
   */
  it('Handle no response schema', async () => {
    const query = /* GraphQL */ `
      {
        testLinkwithNestedParam {
          nesting1 {
            nesting2
          }
          returnNestedNumber
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result.data).toEqual({
      testLinkwithNestedParam: {
        nesting1: {
          nesting2: 5,
        },
        returnNestedNumber: 5,
      },
    });
  });
});
