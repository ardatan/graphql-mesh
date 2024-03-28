/* eslint-disable import/no-nodejs-modules */
import { promises } from 'fs';
import { join } from 'path';
import { printSchema } from 'graphql';
import { fetch } from '@whatwg-node/fetch';
import { SOAPLoader } from '../src/index.js';

const { readFile } = promises;

const examples = ['example1', 'example2'];

describe('Examples', () => {
  examples.forEach(example => {
    it(`should generate schema for ${example}`, async () => {
      const soapLoader = new SOAPLoader({
        subgraphName: example,
        fetch,
      });
      const example1Wsdl = await readFile(
        join(__dirname, './fixtures/' + example + '.wsdl'),
        'utf8',
      );
      await soapLoader.loadWSDL(example1Wsdl);
      const schema = soapLoader.buildSchema();
      expect(printSchema(schema)).toMatchSnapshot(example);
    });
  });
});
