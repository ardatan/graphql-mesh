import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import {
  createNamingConventionTransform,
  defineConfig as defineComposeConfig,
  upperCase,
} from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Wiki', {
        source: './openapi.json',
        endpoint: 'https://api.chucknorris.io',
      }),
      transforms: [
        createNamingConventionTransform({
          enumValues: upperCase,
        }),
      ],
    },
  ],
});

export const gatewayConfig = defineGatewayConfig({});
