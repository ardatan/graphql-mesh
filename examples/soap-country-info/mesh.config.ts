import { MeshComposeCLIConfig } from '@graphql-mesh/compose-cli';
import useSnapshot from '@graphql-mesh/plugin-snapshot';
import { MeshServeCLIConfig } from '@graphql-mesh/serve-cli';
import { loadSOAPSubgraph } from '@omnigraph/soap';

export const composeConfig: MeshComposeCLIConfig = {
  subgraphs: [
    {
      sourceHandler: loadSOAPSubgraph('CountryInfo', {
        source:
          'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL',
      }),
    },
  ],
};

export const serveConfig: MeshServeCLIConfig = {
  plugins: () => [
    useSnapshot({
      apply: ['http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso'],
      outputDir: './__snapshots__',
    }),
  ],
};
