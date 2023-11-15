// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync, writeFileSync } from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { convertFusionSupergraphFromFederationSupergraph } from '../src/federationSupergraph';

describe('Federation', () => {
  const fusionSupergraphSdlPath = join(__dirname, 'fixtures/fusion.graphql');
  it('converts a Federation supergraph to a Fusion supergraph', async () => {
    const supergraphSdl = readFileSync(
      join(__dirname, 'fixtures/gateway/supergraph.graphql'),
      'utf8',
    );
    const fusionSupergraph = convertFusionSupergraphFromFederationSupergraph(supergraphSdl);
    const fusionSupergraphSdl = printSchemaWithDirectives(fusionSupergraph);
    writeFileSync(fusionSupergraphSdlPath, fusionSupergraphSdl);
    expect(fusionSupergraphSdl).toMatchSnapshot();
  });
});
