import { SOAPLoader } from '../src/SOAPLoader';
import { fetch } from '@whatwg-node/fetch';
import { parse } from 'graphql';
import { createExecutorFromSchemaAST } from '../src/executor';
import { getDocumentNodeFromSchema, printSchemaWithDirectives } from '@graphql-tools/utils';

describe('SOAP Loader', () => {
  it('should generate the schema correctly', async () => {
    const soapLoader = new SOAPLoader({
      fetch,
    });
    await soapLoader.fetchWSDL('https://www.w3schools.com/xml/tempconvert.asmx?WSDL');
    const schema = soapLoader.buildSchema();
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
  it.skip('should execute SOAP calls correctly', async () => {
    const soapLoader = new SOAPLoader({
      fetch,
    });
    await soapLoader.fetchWSDL('https://www.crcind.com/csp/samples/SOAP.Demo.cls?WSDL');
    const schema = soapLoader.buildSchema();
    const executor = createExecutorFromSchemaAST(getDocumentNodeFromSchema(schema), fetch);
    const result: any = await executor({
      document: parse(/* GraphQL */ `
        mutation AddInteger {
          s0_SOAPDemo_SOAPDemoSoap_AddInteger(AddInteger: { Arg1: 2, Arg2: 3 }) {
            AddIntegerResult
          }
        }
      `),
    });
    // eslint-disable-next-line eqeqeq
    expect(result?.data?.s0_SOAPDemo_SOAPDemoSoap_AddInteger.AddIntegerResult == 5).toBeTruthy();
  });
});
