import { parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { createExecutorFromSchemaAST, SOAPLoader } from '@omnigraph/soap';
import { fetch } from '@whatwg-node/fetch';
import { dummyLogger as logger } from '../../../testing/dummyLogger';

describe('SOAP Headers', () => {
  let existingUserName: string;
  let existingPassword: string;
  beforeAll(() => {
    existingUserName = process.env.USER_NAME;
    existingPassword = process.env.PASSWORD;
    process.env.USER_NAME = 'user';
    process.env.PASSWORD = 'password';
  });
  afterAll(() => {
    process.env.USER_NAME = existingUserName;
    process.env.PASSWORD = existingPassword;
  });
  it('should pass headers to the executor', async () => {
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
      logger,
      soapHeaders: {
        namespace: 'guild',
        content: {
          MyHeader: {
            UserName: '{env.USER_NAME}',
            Password: '{env.PASSWORD}',
          },
        },
      },
    });
    await soapLoader.fetchWSDL('https://www.crcind.com/csp/samples/SOAP.Demo.cls?WSDL');
    const schema = soapLoader.buildSchema();
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('soap-with-headers');
    const fetchSpy = jest.fn(fetch);
    const executor = createExecutorFromSchemaAST(schema, fetchSpy);
    await executor({
      document: parse(/* GraphQL */ `
        mutation AddInteger {
          s0_SOAPDemo_SOAPDemoSoap_AddInteger(AddInteger: { Arg1: 2, Arg2: 3 }) {
            AddIntegerResult
          }
        }
      `),
    });
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({
      body: expect.stringContaining(
        '<soap:Header><header:MyHeader><header:UserName>user</header:UserName><header:Password>password</header:Password></header:MyHeader></soap:Header>',
      ),
    });
  });
});
