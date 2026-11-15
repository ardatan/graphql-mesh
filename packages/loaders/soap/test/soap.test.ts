/* eslint-disable import/no-nodejs-modules */
import { promises as fsPromises } from 'fs';
import { globalAgent } from 'https';
import { join } from 'path';
import { execute, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { dummyLogger as log } from '../../../testing/dummyLogger';
import { processDirectives, SOAPLoader } from '../src/index.js';

describe('SOAP Loader', () => {
  afterEach(() => {
    globalAgent.destroy();
  });
  // TODO: Implement this locally later
  // Now E2E tests have it covered
  it.skip('should execute SOAP calls correctly', async () => {
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
      log,
    });
    await soapLoader.fetchWSDL('https://www.crcind.com/csp/samples/SOAP.Demo.cls?WSDL');
    const schema = processDirectives(soapLoader.buildSchema(), { globalFetch: fetch });
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
    expect(result?.data?.s0_SOAPDemo_SOAPDemoSoap_AddInteger.AddIntegerResult).toEqual(5);
  });

  it('should create executor for a service with mutations and query placeholder', async () => {
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
      log,
    });
    const example1Wsdl = await fsPromises.readFile(
      join(__dirname, './fixtures/greeting.wsdl'),
      'utf8',
    );
    await soapLoader.loadWSDL(example1Wsdl);
    const schema = soapLoader.buildSchema();
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();

    const executable = processDirectives(schema, {
      globalFetch: (() => {}) as any,
    });

    const result = await execute({
      schema: executable,
      document: parse(/* GraphQL */ `
        {
          placeholder
        }
      `),
    });

    expect(result.errors).toBeUndefined();
  });
});
