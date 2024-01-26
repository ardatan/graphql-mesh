// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync } from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { convertSupergraphToFusiongraph } from '../src/supergraph';

describe('Federation', () => {
  it('converts a Supergraph to a Fusiongraph', async () => {
    const supergraphSdl = readFileSync(
      join(__dirname, 'fixtures/gateway/supergraph.graphql'),
      'utf8',
    );
    const fusiongraph = convertSupergraphToFusiongraph(supergraphSdl);
    const fusiongraphSdl = printSchemaWithDirectives(fusiongraph);
    expect(fusiongraphSdl).toMatchSnapshot();
  });
});
