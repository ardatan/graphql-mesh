import { SOAPLoader } from '../src/SOAPLoader';
import { fetch } from '@whatwg-node/fetch';
import { execute, parse, printSchema } from 'graphql';

describe('SOAP Loader', () => {
  it('should generate the schema correctly', async () => {
    const soapLoader = new SOAPLoader({
      fetch,
    });
    await soapLoader.fetchWSDL('https://www.w3schools.com/xml/tempconvert.asmx?WSDL');
    const schema = soapLoader.buildSchema();
    expect(printSchema(schema)).toMatchSnapshot();
  });
  it('should execute SOAP calls correctly', async () => {
    const soapLoader = new SOAPLoader({
      fetch,
    });
    await soapLoader.fetchWSDL('https://www.crcind.com/csp/samples/SOAP.Demo.cls?WSDL');
    const schema = soapLoader.buildSchema();
    const result: any = await execute({
      schema,
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
