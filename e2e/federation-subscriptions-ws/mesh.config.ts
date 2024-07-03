import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { MeshServePlugin } from '@graphql-mesh/serve-runtime';
import { buildGraphQLWSExecutor } from '@graphql-tools/executor-graphql-ws';

export const serveConfig = defineServeConfig({
  plugins() {
    return [MyPlugin];
  },
});

const MyPlugin: MeshServePlugin = {
  onSubgraphExecute({ executionRequest, transportEntry, setExecutor }) {
    if (executionRequest.operationType === 'subscription') {
      const token = executionRequest.context.request?.headers?.authorization;
      const executor = buildGraphQLWSExecutor({
        url: transportEntry.location.replace('http', 'ws'),
        connectionParams: token
          ? {
              // apollo federation passes the HTTP `Authorization` header through `connectionParams.token`
              // see https://www.apollographql.com/docs/router/executing-operations/subscription-support/#websocket-auth-support
              token,
            }
          : undefined,
      });
      setExecutor(executor);
    }
  },
};
