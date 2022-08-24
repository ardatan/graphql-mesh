import { execute, GraphQLSchema, parse } from 'graphql';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { fetch } from '@whatwg-node/fetch';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

let createdSchema: GraphQLSchema;

jest.setTimeout(15000);

// This test suite is used to verify the behavior of anyOf and oneOf handling
describe('OpenAPI loader: Handle anyOf and oneOf', () => {
  /**
   * Set up the schema
   */
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch,
      source: './fixtures/example_oas4.json',
      cwd: __dirname,
    });
  });

  const anyOfQuery = /* GraphQL */ `
    {
      __schema {
        queryType {
          fields {
            name
            description
            type {
              name
              kind
              fields {
                name
                type {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const oneOfQuery = /* GraphQL */ `
    {
      __schema {
        queryType {
          fields {
            name
            description
            type {
              name
              kind
              possibleTypes {
                name
                fields {
                  type {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  describe('anyOf', () => {
    const anyOfAst = parse(anyOfQuery);

    /**
     * anyOf contains two member schemas
     *
     * Both member schemas contain the same field 'commonAttribute'
     *
     * Because they are the same, the created GraphQL object should only have one
     * 'commonAttribute' field
     */
    it('Basic anyOf test using the same member schemas', async () => {
      const result = await execute({
        schema: createdSchema,
        document: anyOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'anyOf';
        })
      ).toEqual({
        name: 'anyOf',
        description: 'Basic anyOf test using the same member schemas',
        type: {
          name: 'anyOf_200_response',
          kind: 'OBJECT',
          fields: [
            {
              name: 'commonAttribute',
              type: {
                name: 'String',
              },
            },
          ],
        },
      });
    });

    /**
     * anyOf contains two member schemas
     *
     * One member schema contains a 'commonAttribute' field and the other
     * member schema contains a 'differentAttribute' field
     *
     * Because they are the different, the created GraphQL object should have both
     * fields
     */
    it('Basic anyOf test with different member schemas', async () => {
      const result = await execute({
        schema: createdSchema,
        document: anyOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'anyOf2';
        })
      ).toEqual({
        name: 'anyOf2',
        description: 'Basic anyOf test with different member schemas',
        type: {
          name: 'anyOf2_200_response',
          kind: 'OBJECT',
          fields: [
            {
              name: 'commonAttribute',
              type: {
                name: 'String',
              },
            },
            {
              name: 'differentAttribute',
              type: {
                name: 'String',
              },
            },
          ],
        },
      });
    });

    /**
     * anyOf contains two member schemas
     *
     * Both member schemas contain the same complex nested field
     *
     * Because they are the same, the created GraphQL object should only have one
     * field
     */
    it('anyOf test with the same nested member schemas', async () => {
      const result = await execute({
        schema: createdSchema,
        document: anyOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'anyOf3';
        })
      ).toEqual({
        name: 'anyOf3',
        description: 'anyOf test with the same nested member schemas',
        type: {
          name: 'anyOf3_200_response',
          kind: 'OBJECT',
          fields: [
            {
              name: 'commonAttribute',
              type: {
                name: 'commonAttributeObject',
              },
            },
          ],
        },
      });
    });

    /**
     * anyOf contains two member schemas
     *
     * The member schemas contain complex nested fields that are different at the root
     * level.
     *
     * Because they are different at the root level, the created GraphQL object
     * should have two fields.
     */
    it('anyOf test with different nested member schemas', async () => {
      const result = await execute({
        schema: createdSchema,
        document: anyOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'anyOf4';
        })
      ).toEqual({
        name: 'anyOf4',
        description: 'anyOf test with different nested member schemas',
        type: {
          name: 'anyOf4_200_response',
          kind: 'OBJECT',
          fields: [
            {
              name: 'commonAttribute',
              type: {
                name: 'commonAttributeObject',
              },
            },
            {
              name: 'differentAttribute',
              type: {
                name: 'commonAttributeObject',
              },
            },
          ],
        },
      });
    });

    /**
     * anyOf contains two member schemas
     *
     * The member schemas contain complex nested fields that are same at the root
     * level but different at other levels.
     *
     * This leads to a conlict because the same field has different schemas. As a
     * result, the field will use the arbitrary JSON type.
     */
    it('anyOf test with different nested member schemas, leading to conflict', async () => {
      const result = await execute({
        schema: createdSchema,
        document: anyOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'anyOf5';
        })
      ).toEqual({
        name: 'anyOf5',
        description: 'anyOf test with different nested member schemas, leading to conflict',
        type: {
          name: 'anyOf5_200_response',
          kind: 'OBJECT',
          fields: [
            {
              name: 'commonAttribute',
              type: {
                name: 'JSON',
              },
            },
          ],
        },
      });
    });

    /**
     * anyOf contains two member schemas
     *
     * The member schemas are of different types. One is an object type and the other
     * is an scalar type.
     *
     * This leads to a conlict. As a result, a nested field with the scalar's name will be generated.
     */
    it('anyOf test with incompatible member schema types', async () => {
      const result = await execute({
        schema: createdSchema,
        document: anyOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'anyOf6';
        })
      ).toEqual({
        name: 'anyOf6',
        description: 'anyOf test with incompatible member schema types',
        type: {
          name: 'anyOf6_200_response',
          kind: 'OBJECT',
          fields: [
            {
              name: 'commonAttribute',
              type: {
                name: 'String',
              },
            },
            {
              name: 'String',
              type: {
                name: 'String',
              },
            },
          ],
        },
      });
    });

    /**
     * anyOf contains three member schemas
     *
     * Only one of the member schemas is an object type schema.
     *
     * The created type will have a "JSON" field with "JSON" type that resolves the entire object.
     */
    it('anyOf test with some extraneous member schemas', async () => {
      const result = await execute({
        schema: createdSchema,
        document: anyOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'anyOf7';
        })
      ).toEqual({
        name: 'anyOf7',
        description: 'anyOf test with some extraneous member schemas',
        type: {
          name: 'anyOf7_200_response',
          kind: 'OBJECT',
          fields: [
            {
              name: 'commonAttribute',
              type: {
                name: 'String',
              },
            },
            {
              name: 'JSON',
              type: {
                name: 'JSON',
              },
            },
          ],
        },
      });
    });

    /**
     * anyOf contains three member schemas
     *
     * None of the member schemas are object type schemas. As a result, it will create fields for each scalar type.
     */
    it('anyOf test with no object type member schemas', async () => {
      const result = await execute({
        schema: createdSchema,
        document: anyOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'anyOf8';
        })
      ).toEqual({
        name: 'anyOf8',
        description: 'anyOf test with no object type member schemas',
        type: {
          name: 'anyOf8_200_response',
          kind: 'OBJECT',
          fields: [
            {
              name: 'Int',
              type: {
                name: 'Int',
              },
            },
            {
              name: 'JSON',
              type: {
                name: 'JSON',
              },
            },
          ],
        },
      });
    });

    /**
     * anyOf contains three member schemas
     *
     * None of the member schemas are object type schemas but because there is an
     * external type provided in the root schema, it can utilize the proper typing.
     */
    it('anyOf test with extraneous member schemas with external type', async () => {
      const result = await execute({
        schema: createdSchema,
        document: anyOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'anyOf9';
        })
      ).toEqual({
        name: 'anyOf9',
        description: 'anyOf test with extraneous member schemas with external type',
        type: {
          name: 'Int',
          kind: 'SCALAR',
          fields: null,
        },
      });
    });

    /**
     * anyOf contains two member schemas and allOf contains an additional one
     *
     * None of the schemas have conflicts so all three should be utilized
     */
    it('Basic anyOf test with allOf', async () => {
      const result = await execute({
        schema: createdSchema,
        document: anyOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'anyOf10';
        })
      ).toEqual({
        name: 'anyOf10',
        description: 'Basic anyOf test with allOf',
        type: {
          name: 'anyOf10_200_response',
          kind: 'OBJECT',
          fields: [
            {
              name: 'anotherAttribute',
              type: {
                name: 'String',
              },
            },
            {
              name: 'commonAttribute',
              type: {
                name: 'String',
              },
            },
            {
              name: 'differentAttribute',
              type: {
                name: 'String',
              },
            },
          ],
        },
      });
    });

    /**
     * anyOf contains two member schemas and allOf contains an additional one that
     * is nested in another anyOf
     *
     * Resolving the allOf should correctly collapse all of the (nested) anyOfs
     * and allow all three schemas to be utilized
     */
    it('anyOf test with allOf, requiring anyOf collapse', async () => {
      const result = await execute({
        schema: createdSchema,
        document: anyOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'anyOf11';
        })
      ).toEqual({
        name: 'anyOf11',
        description: 'anyOf test with allOf, requiring anyOf collapse',
        type: {
          name: 'anyOf11_200_response',
          kind: 'OBJECT',
          fields: [
            {
              name: 'anotherAttribute',
              type: {
                name: 'String',
              },
            },
            {
              name: 'commonAttribute',
              type: {
                name: 'String',
              },
            },
            {
              name: 'differentAttribute',
              type: {
                name: 'String',
              },
            },
          ],
        },
      });
    });
  });

  describe('oneOf', () => {
    const oneOfAst = parse(oneOfQuery);

    /**
     * oneOf contains two member schemas
     *
     * Because the schemas are different object types, the created GraphQL union
     * type has two differnet member types.
     */
    it('Basic oneOf test', async () => {
      const result = await execute({
        schema: createdSchema,
        document: oneOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'oneOf';
        })
      ).toEqual({
        name: 'oneOf',
        description: 'Basic oneOf test',
        type: {
          name: 'oneOf_200_response',
          kind: 'UNION',
          possibleTypes: [
            {
              name: 'commonAttributeObject',
              fields: [
                {
                  type: {
                    name: 'String',
                  },
                },
              ],
            },
            {
              name: 'differentAttributeObject',
              fields: [
                {
                  type: {
                    name: 'String',
                  },
                },
              ],
            },
          ],
        },
      });
    });

    /**
     * oneOf contains two member schemas
     *
     * Because one of the member schemas is not an object type, then create fields for each non-object type.
     */
    it('oneOf test with non-object type member schema', async () => {
      const result = await execute({
        schema: createdSchema,
        document: oneOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'oneOf2';
        })
      ).toEqual({
        name: 'oneOf2',
        description: 'oneOf test with non-object type member schema',
        type: {
          kind: 'UNION',
          name: 'oneOf2_200_response',
          possibleTypes: [
            {
              name: 'commonAttributeObject',
              fields: [
                {
                  type: {
                    name: 'String',
                  },
                },
              ],
            },
            {
              name: 'Int_container',
              fields: [
                {
                  type: {
                    name: 'Int',
                  },
                },
              ],
            },
          ],
        },
      });
    });

    /**
     * oneOf contains two member schemas
     *
     * None of the member schemas are object types, then create fields for each non-object type.
     */
    it('oneOf test with no object type member schemas', async () => {
      const result = await execute({
        schema: createdSchema,
        document: oneOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'oneOf3';
        })
      ).toEqual({
        name: 'oneOf3',
        description: 'oneOf test with no object type member schemas',
        type: {
          kind: 'UNION',
          name: 'oneOf3_200_response',
          possibleTypes: [
            {
              name: 'String_container',
              fields: [
                {
                  type: {
                    name: 'String',
                  },
                },
              ],
            },
            {
              name: 'Int_container',
              fields: [
                {
                  type: {
                    name: 'Int',
                  },
                },
              ],
            },
          ],
        },
      });
    });

    /**
     * oneOf contains two member schemas
     *
     * The member schemas contain extranous data but because the root schema contains a
     * type, it is able to utilize the proper type.
     */
    it('oneOf test with extraneous member schemas', async () => {
      const result = await execute({
        schema: createdSchema,
        document: oneOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'oneOf4';
        })
      ).toEqual({
        name: 'oneOf4',
        description: 'oneOf test with extraneous member schemas',
        type: {
          name: 'Int',
          kind: 'SCALAR',
          possibleTypes: null,
        },
      });
    });

    /**
     * oneOf contains two member schemas and an allOf
     *
     * Only schemas within the oneOf should be utilized
     *
     * TODO: verify this behavior and also create a test with additional root properties
     */
    it('Basic oneOf test with allOf', async () => {
      const result = await execute({
        schema: createdSchema,
        document: oneOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'oneOf5';
        })
      ).toEqual({
        name: 'oneOf5',
        description: 'Basic oneOf test with allOf',
        type: {
          name: 'oneOf5_200_response',
          kind: 'UNION',
          possibleTypes: [
            {
              name: 'commonAttributeObject',
              fields: [
                {
                  type: {
                    name: 'String',
                  },
                },
              ],
            },
            {
              name: 'differentAttributeObject',
              fields: [
                {
                  type: {
                    name: 'String',
                  },
                },
              ],
            },
          ],
        },
      });
    });

    /**
     * oneOf contains two member schemas and allOf contains an additional one that
     * is nested in another oneOf
     *
     * Resolving the allOf should correctly collapse all of the (nested) oneOfs
     * and allow all three schemas to be utilized
     */
    it('oneOf test with allOf, requiring oneOf collapse', async () => {
      const result = await execute({
        schema: createdSchema,
        document: oneOfAst,
      });

      expect(
        (result.data.__schema as any).queryType.fields.find((field: { name: string }) => {
          return field.name === 'oneOf6';
        })
      ).toEqual({
        name: 'oneOf6',
        description: 'oneOf test with allOf, requiring oneOf collapse',
        type: {
          name: 'oneOf6_200_response',
          kind: 'UNION',
          possibleTypes: [
            {
              name: 'commonAttributeObject',
              fields: [
                {
                  type: {
                    name: 'String',
                  },
                },
              ],
            },
            {
              name: 'differentAttributeObject',
              fields: [
                {
                  type: {
                    name: 'String',
                  },
                },
              ],
            },
            {
              name: 'anotherAttributeObject',
              fields: [
                {
                  type: {
                    name: 'String',
                  },
                },
              ],
            },
          ],
        },
      });
    });
  });
});
