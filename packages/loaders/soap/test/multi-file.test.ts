/* eslint-disable import/no-nodejs-modules */
import { promises } from 'fs';
import { join } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { dummyLogger as logger } from '../../../testing/dummyLogger';
import { SOAPLoader } from '../src/index.js';

const { readFile } = promises;

describe('Multi-file WSDL', () => {
  it("resolves nested <wsdl:import> / <xsd:import> against each document's own location", async () => {
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

  it('resolves relative source against the loader cwd, not process.cwd()', async () => {
    // Same fixture, but the source is given as a relative path with the
    // loader's cwd set to the parent directory. Exercises the
    // relative-baseUrl-anchoring code in loadWSDL — without it, the nested
    // imports would resolve against process.cwd() and ENOENT.
    const fixturesDir = join(__dirname, './fixtures');
    const relativeSource = 'multi-file/service.wsdl';
    const wsdl = await readFile(join(fixturesDir, relativeSource), 'utf-8');

    const loader = new SOAPLoader({
      subgraphName: 'multi-file',
      fetch,
      logger,
      cwd: fixturesDir,
    });
    await loader.loadWSDL(wsdl, relativeSource);
    const schema = loader.buildSchema();

    // Same schema as the absolute-source case — proving relative source is
    // anchored to loader cwd correctly.
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
