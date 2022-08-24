import { execute, GraphQLSchema, parse } from 'graphql';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { startServer, stopServer } from '../../../handlers/openapi/test/example_api5_server';
import { fetch } from '@whatwg-node/fetch';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

let createdSchema: GraphQLSchema;
const PORT = 3007;
// Update PORT for this test case:
const baseUrl = `http://localhost:${PORT}/api`;

jest.setTimeout(15000);

// Testing the naming convention
describe('example_api', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api', {
      fetch,
      baseUrl,
      source: './fixtures/example_oas5.json',
      cwd: __dirname,
    });
    await startServer(PORT);
  });

  /**
   * Shut down API server
   */
  afterAll(() => {
    return stopServer();
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  /**
   * Because of the simpleNames option, 'o_d_d___n_a_m_e' will not be turned into
   * 'oDDNAME'.
   */
  it('Basic simpleNames option test', async () => {
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
   * Because of the simpleNames option, 'w-e-i-r-d___n-a-m-e' will be turned into
   * 'w_e_i_r_d___n_a_m_e' and not 'wEIRDNAME'.
   */
  it('Basic simpleNames option test with GraphQL unsafe values', async () => {
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
   * Because of the simpleNames option, 'w-e-i-r-d___n-a-m-e2' will be turned into
   * 'w_e_i_r_d___n_a_m_e2_by_f_u_n_k_y___p_a_r_a_m_e_t_e_r' and not 'wEIRDNAME2'.
   */
  it('Basic simpleNames option test with GraphQL unsafe values and a parameter', async () => {
    const query = /* GraphQL */ `
      {
        w_e_i_r_d___n_a_m_e2_by_f_u_n_k_y___p_a_r_a_m_e_t_e_r(f_u_n_k_y___p_a_r_a_m_e_t_e_r: "Arnold") {
          data
        }
      }
    `;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        w_e_i_r_d___n_a_m_e2_by_f_u_n_k_y___p_a_r_a_m_e_t_e_r: {
          data: 'weird name 2 param: Arnold',
        },
      },
    });
  });

  /**
   * Because of the simpleNames option, 'w-e-i-r-d___n-a-m-e___l-i-n-k' will be
   * turned into 'w_e_i_r_d___n_a_m_e___l_i_n_k' and not 'wEIRDNAMELINK'.
   */
  it('Basic simpleNames option test with a link', async () => {
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
   * Because of the simpleNames option, 'w-e-i-r-d___n-a-m-e2___l-i-n-k' will be
   * turned into 'w_e_i_r_d___n_a_m_e2___l_i_n_k' and not 'wEIRDNAME2LINK'.
   */
  it('Basic simpleNames option test with a link that has parameters', async () => {
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
   * Because of the simpleNames option, 'w-e-i-r-d___n-a-m-e3___l-i-n-k' will be
   * turned into 'w_e_i_r_d___n_a_m_e3___l_i_n_k' and not 'wEIRDNAME3LINK'.
   */
  it('Basic simpleNames option test with a link that has exposed parameters', async () => {
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
});
