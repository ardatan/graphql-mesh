/* eslint-disable import/no-nodejs-modules */
import { promises } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
import { MeshFetch } from '@graphql-mesh/types';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { createExecutorFromSchemaAST, SOAPLoader } from '../src';

const { readFile } = promises;

describe('SOAP Loader', () => {
  it('should generate the schema correctly', async () => {
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
    });
    await soapLoader.fetchWSDL('https://www.w3schools.com/xml/tempconvert.asmx?WSDL');
    const schema = soapLoader.buildSchema();
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
  it('should execute SOAP calls correctly', async () => {
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
    });
    await soapLoader.fetchWSDL('https://www.crcind.com/csp/samples/SOAP.Demo.cls?WSDL');
    const schema = soapLoader.buildSchema();
    const executor = createExecutorFromSchemaAST(schema, fetch);
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
    expect(result?.data?.s0_SOAPDemo_SOAPDemoSoap_AddInteger.AddIntegerResult).toEqual(5);
  });

  it('should create executor for a service with mutations and query placeholder', async () => {
    const soapLoader = new SOAPLoader({
      subgraphName: 'Test',
      fetch,
    });
    const example1Wsdl = await readFile(join(__dirname, './fixtures/greeting.wsdl'), 'utf8');
    await soapLoader.loadWSDL(example1Wsdl);
    const schema = soapLoader.buildSchema();
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();

    const executor = createExecutorFromSchemaAST(schema, (() => {}) as unknown as MeshFetch);

    let err;
    try {
      await executor({
        document: parse(/* GraphQL */ `
          {
            placeholder
          }
        `),
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeUndefined();
  });
});
