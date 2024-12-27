import { parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { createExecutorFromSchemaAST, SOAPLoader } from '@omnigraph/soap';
import { fetch } from '@whatwg-node/fetch';
import { dummyLogger as logger } from '../../../testing/dummyLogger';

describe('SOAP Headers', () => {
  it('should pass headers to the executor', async () => {
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
      logger,
      soapHeaders: {
        namespace: 'guild',
        content: {
          MyHeader: {
            UserName: 'test',
            Password: 'test',
          },
        },
      },
    });
    await soapLoader.fetchWSDL('https://www.crcind.com/csp/samples/SOAP.Demo.cls?WSDL');
    const schema = soapLoader.buildSchema();
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('soap-with-headers');
    const fetchSpy = jest.fn(fetch);
    const executor = createExecutorFromSchemaAST(schema, fetchSpy);
    const result: any = await executor({
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
        '<soap:Header><header:MyHeader><header:UserName>test</header:UserName><header:Password>test</header:Password></header:MyHeader></soap:Header>',
      ),
    });
  });
});
