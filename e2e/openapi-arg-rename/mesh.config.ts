import { Args } from '@e2e/args';
import {
  camelCase,
  createNamingConventionTransform,
  createRenameTransform,
  defineConfig as defineComposeConfig,
} from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const args = Args(process.argv);

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Wiki', {
        source: './openapi.json',
        endpoint: 'http://localhost:' + args.getServicePort('Wiki'),
      }),
      transforms: [
        createNamingConventionTransform({
          fieldNames: camelCase,
        }),
        createRenameTransform({
          argRenamer: ({ argName, fieldName }) => {
            if (fieldName === 'postBad' && argName === 'input') {
              return 'requestBody';
            }

            return argName;
          },
        }),
      ],
    },
  ],
});
export const serveConfig = defineServeConfig({});
