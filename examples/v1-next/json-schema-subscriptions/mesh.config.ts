import { OperationTypeNode } from 'graphql';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import useMeshLiveQuery from '@graphql-mesh/plugin-live-query';
import { defineConfig as defineServeConfig, useWebhooks } from '@graphql-mesh/serve-cli';
import { PubSub } from '@graphql-mesh/utils';
import { loadJSONSchemaSubgraph } from '@omnigraph/json-schema';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadJSONSchemaSubgraph('Example', {
        endpoint: 'http://localhost:4002',
        operationHeaders: {
          'Content-Type': 'application/json',
        },
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'todos',
            path: '/todos',
            method: 'GET',
            responseSample: './todos.json',
          },
          {
            type: OperationTypeNode.MUTATION,
            field: 'addTodo',
            path: '/todo',
            method: 'POST',
            requestSample: './addTodo.json',
            responseSample: './todo.json',
          },
          {
            type: OperationTypeNode.SUBSCRIPTION,
            field: 'todoAdded',
            pubsubTopic: 'webhook:post:/webhooks/todo_added',
            responseSample: './todo.json',
          },
        ],
      }),
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    directive @live on QUERY
  `,
});

export const serveConfig = defineServeConfig({
  fusiongraph: './fusiongraph.graphql',
  pubsub: new PubSub(),
  plugins: ctx => [
    useWebhooks(ctx),
    useMeshLiveQuery({
      ...ctx,
      invalidations: [
        {
          field: 'Mutation.addTodo',
          invalidate: ['Query.todos'],
        },
      ],
    }),
  ],
});
