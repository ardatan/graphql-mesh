// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync, writeFileSync } from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { convertSupergraphToFusiongraph } from '../src/supergraph';

describe('Federation', () => {
  const fusiongraphSdlPath = join(__dirname, 'fixtures/fusiongraph.graphql');
  it('converts a Supergraph to a Fusiongraph', async () => {
    const supergraphSdl = readFileSync(
      join(__dirname, 'fixtures/gateway/supergraph.graphql'),
      'utf8',
    );
    const fusiongraph = convertSupergraphToFusiongraph(supergraphSdl);
    const fusiongraphSdl = printSchemaWithDirectives(fusiongraph);
    writeFileSync(fusiongraphSdlPath, fusiongraphSdl);
    expect(fusiongraphSdl).toMatchSnapshot();
  });
});
