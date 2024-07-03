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
      const executor = buildGraphQLWSExecutor({
        url: transportEntry.location.replace('http', 'ws'),
      });
      setExecutor(executor);
    }
  },
};
