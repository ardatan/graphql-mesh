import { OperationTypeNode } from 'graphql';
import { Args } from '@e2e/args';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { loadJSONSchemaSubgraph } from '@omnigraph/json-schema';

const args = Args(process.argv);

export const composeConfig = defineComposeConfig({
  target: args.get('target'),
  subgraphs: [
    {
      sourceHandler: loadJSONSchemaSubgraph('Reddit', {
        schemaHeaders: {
          'User-Agent': 'Mesh',
        },
        operationHeaders: {
          'User-Agent': 'Mesh',
        },
        endpoint: 'https://www.reddit.com',
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'subreddit',
            path: '/r/{args.subreddit}.json',
            method: 'GET',
            responseSample: 'https://www.reddit.com/r/AskReddit.json',
            responseTypeName: 'Subreddit',
            argTypeMap: {
              subreddit: {
                type: 'string',
              },
            },
          },
        ],
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  port: args.getPort(),
  fusiongraph: args.get('fusiongraph'),
});
