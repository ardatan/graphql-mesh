/* eslint-disable import/no-nodejs-modules */
import { SOAPLoader } from '../src';
import { promises } from 'fs';
import { printSchema } from 'graphql';
import { join } from 'path';
import { fetch } from '@whatwg-node/fetch';

const { readFile } = promises;

describe('Example 1', () => {
  it('should generate the schema correctly', async () => {
    const soapLoader = new SOAPLoader({
      fetch,
    });
    const example1Wsdl = await readFile(join(__dirname, './fixtures/example1.wsdl'), 'utf8');
    await soapLoader.loadWSDL(example1Wsdl);
    const schema = soapLoader.buildSchema();
    expect(printSchema(schema)).toMatchSnapshot();
  });
});
