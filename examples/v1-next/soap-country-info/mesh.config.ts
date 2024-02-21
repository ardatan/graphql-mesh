import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import useSnapshot from '@graphql-mesh/plugin-snapshot';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { loadSOAPSubgraph } from '@omnigraph/soap';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadSOAPSubgraph('CountryInfo', {
        source:
          'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL',
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  fusiongraph: './fusiongraph.graphql',
  plugins: () => [
    useSnapshot({
      apply: ['http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso'],
      outputDir: './__snapshots__',
    }),
  ],
});
