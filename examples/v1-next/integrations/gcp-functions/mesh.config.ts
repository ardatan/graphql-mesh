import { OperationTypeNode } from 'graphql';
import { MeshComposeCLIConfig } from '@graphql-mesh/compose-cli';
import { loadJSONSchemaSubgraph } from '@omnigraph/json-schema';

export const composeConfig: MeshComposeCLIConfig = {
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
};
