/* eslint-disable import/no-nodejs-modules */
import { promises } from 'fs';
import { join } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { dummyLogger as logger } from '../../../testing/dummyLogger';
import { SOAPLoader } from '../src/index.js';

const { readFile } = promises;

describe('Multi-file WSDL', () => {
  it('resolves nested <wsdl:import> / <xsd:import> against each document\'s own location', async () => {
    // Fixture layout:
    //   service.wsdl                  — entry (has <xsd:schema> wrapper-only block)
    //   xsd/types.xsd                 — imports sibling names.xsd
    //   xsd/names.xsd                 — defines Name type
    //
    // Without per-file base-URI tracking the second-level import (names.xsd
    // from types.xsd) would resolve against the WSDL directory rather than
    // the XSD's own directory and fail with ENOENT.
    const entryPath = join(__dirname, './fixtures/multi-file/service.wsdl');
    const wsdl = await readFile(entryPath, 'utf-8');

    const loader = new SOAPLoader({ subgraphName: 'multi-file', fetch, logger });
    await loader.loadWSDL(wsdl, entryPath);
    const schema = loader.buildSchema();

    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
