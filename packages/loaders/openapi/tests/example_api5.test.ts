import { execute, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';
import { exampleApi5 } from './example_api5_server.js';

let createdSchema: GraphQLSchema;

describe('OpenAPI Loader: Testing the naming convention', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    // Update PORT for this test case:
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api', {
      fetch: exampleApi5.fetch,
      endpoint: 'http://localhost:3000/api',
      source: './fixtures/example_oas5.json',
      cwd: __dirname,
    });
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  /**
   * Because of the naming convention, 'o_d_d___n_a_m_e' will be left as-is.
   */
  it('Naming convention test', async () => {
    const query = /* GraphQL */ `
      {
        o_d_d___n_a_m_e {
          data
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result).toEqual({
      data: {
        o_d_d___n_a_m_e: {
          data: 'odd name',
        },
      },
    });
  });

  /**
   * 'w-e-i-r-d___n-a-m-e' contains GraphQL unsafe characters.
   *
   * Because of the naming convention, 'w-e-i-r-d___n-a-m-e' will be turned into
   * 'w_e_i_r_d___n_a_m_e'.
   */
  it('Naming convention test with GraphQL unsafe values', async () => {
    const query = /* GraphQL */ `
      {
        w_e_i_r_d___n_a_m_e {
          data
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result).toEqual({
      data: {
        w_e_i_r_d___n_a_m_e: {
          data: 'weird name',
        },
      },
    });
  });

  /**
   * 'w-e-i-r-d___n-a-m-e2' contains GraphQL unsafe characters.
   *
   * Because of the naming convention, 'w-e-i-r-d___n-a-m-e2' will be turned into
   * 'w_e_i_r_d___n_a_m_e2_by_f_u_n_k_y___p_a_r_a_m_e_t_e_r'.
   */
  it('Naming convention test with GraphQL unsafe values and a parameter', async () => {
    const query = /* GraphQL */ `
      {
        w_e_i_r_d___n_a_m_e2_by_f_u_n_k_y___p_a_r_a_m_e_t_e_r(
          f_u_n_k_y___p_a_r_a_m_e_t_e_r: "Arnold"
        ) {
          data
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result).toEqual({
      data: {
        w_e_i_r_d___n_a_m_e2_by_f_u_n_k_y___p_a_r_a_m_e_t_e_r: {
          data: 'weird name 2 param: Arnold',
        },
      },
    });
  });

  /**
   * Because of the naming convention, 'w-e-i-r-d___n-a-m-e___l-i-n-k' will be
   * turned into 'w_e_i_r_d___n_a_m_e___l_i_n_k'.
   */
  it('Naming convention test with a link', async () => {
    const query = /* GraphQL */ `
      {
        o_d_d___n_a_m_e {
          w_e_i_r_d___n_a_m_e___l_i_n_k {
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

    expect(result).toEqual({
      data: {
        o_d_d___n_a_m_e: {
          w_e_i_r_d___n_a_m_e___l_i_n_k: {
            data: 'weird name',
          },
        },
      },
    });
  });

  /**
   * Because of the naming convention, 'w-e-i-r-d___n-a-m-e2___l-i-n-k' will be
   * turned into 'w_e_i_r_d___n_a_m_e2___l_i_n_k'.
   */
  it('Naming convention test with a link that has parameters', async () => {
    const query = /* GraphQL */ `
      {
        o_d_d___n_a_m_e {
          w_e_i_r_d___n_a_m_e2___l_i_n_k {
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

    expect(result).toEqual({
      data: {
        o_d_d___n_a_m_e: {
          w_e_i_r_d___n_a_m_e2___l_i_n_k: {
            data: 'weird name 2 param: Charles',
          },
        },
      },
    });
  });

  /**
   * Because of the naming convention, 'w-e-i-r-d___n-a-m-e3___l-i-n-k' will be
   * turned into 'w_e_i_r_d___n_a_m_e3___l_i_n_k'.
   */
  it('Naming convention test with a link that has exposed parameters', async () => {
    const query = /* GraphQL */ `
      {
        o_d_d___n_a_m_e {
          w_e_i_r_d___n_a_m_e3___l_i_n_k(f_u_n_k_y___p_a_r_a_m_e_t_e_r: "Brittany") {
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

    expect(result).toEqual({
      data: {
        o_d_d___n_a_m_e: {
          w_e_i_r_d___n_a_m_e3___l_i_n_k: {
            data: 'weird name 3 param: Brittany',
          },
        },
      },
    });
  });

  /**
   * 'a-m-b-e-r' will be sanitized to 'a_m_b_e_r' (Replacing GraphQL illegal
   * characters with underscores).
   */
  it('Basic simpleEnumValues option test', async () => {
    const query = /* GraphQL */ `
      {
        getEnum {
          data
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result).toEqual({
      data: {
        getEnum: {
          data: 'a_m_b_e_r',
        },
      },
    });
  });

  /**
   * A GraphQL name cannot begin with a number, therefore 3 will be sanitized
   * to '_3'
   */
  it('Basic simpleEnumValues option test on numerical enum', async () => {
    const query = /* GraphQL */ `
      {
        getNumericalEnum {
          data
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result).toEqual({
      data: {
        getNumericalEnum: {
          data: '_3',
        },
      },
    });
  });

  /**
   * Loader will translate an object enum to an arbitrary JSON type
   */
  it('Basic simpleEnumValues option test on object enum', async () => {
    const query = /* GraphQL */ `
      {
        __type(name: "getObjectEnum_200_response") {
          name
          kind
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result.errors).toBeFalsy();

    expect(result).toEqual({
      data: {
        __type: {
          name: 'getObjectEnum_200_response',
          kind: 'OBJECT',
        },
      },
    });
  });
});
