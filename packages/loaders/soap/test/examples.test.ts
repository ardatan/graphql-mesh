/* eslint-disable import/no-nodejs-modules */
import { promises } from 'fs';
import { join } from 'path';
import { printSchema } from 'graphql';
import type { Logger } from '@graphql-mesh/types';
import { fetch } from '@whatwg-node/fetch';
import { SOAPLoader } from '../src/index.js';

const { readFile } = promises;

const examples = ['example1', 'example2', 'axis', 'greeting', 'tempconvert'];

describe('Examples', () => {
  const mockLogger: Logger = {
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: () => mockLogger,
  };
  examples.forEach(example => {
    it(`should generate schema for ${example}`, async () => {
      const soapLoader = new SOAPLoader({
        subgraphName: example,
        fetch,
        logger: mockLogger,
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
