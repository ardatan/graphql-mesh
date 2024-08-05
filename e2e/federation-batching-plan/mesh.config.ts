import { defineConfig } from '@graphql-mesh/serve-cli';
import type { MeshServePlugin } from '@graphql-mesh/serve-runtime';

export function useExplainQueryPlan(): MeshServePlugin {
  return {};
}

export const serveConfig = defineConfig({
  plugins: () => [useExplainQueryPlan()],
});
