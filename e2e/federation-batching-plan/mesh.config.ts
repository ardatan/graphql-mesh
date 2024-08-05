import { print } from 'graphql';
import { defineConfig } from '@graphql-mesh/serve-cli';
import type { MeshServePlugin } from '@graphql-mesh/serve-runtime';

export function useExplainQueryPlan(): MeshServePlugin {
  const plans = new WeakMap<
    Request,
    { subgraphName: string; query: string; variables: unknown }[]
  >();
  return {
    onExecute({
      args: {
        contextValue: { request },
      },
    }) {
      plans.set(request, []);
      return {
        onExecuteDone({ result, setResult }) {
          const plan = plans.get(request);

          // stabilise
          plan.sort((a, b) => a.query.localeCompare(b.query));

          setResult({
            ...result,
            extensions: {
              ...result['extensions'],
              plan,
            },
          });
        },
      };
    },
    onSubgraphExecute({
      subgraphName,
      executionRequest: {
        context: { request },
        document,
        variables,
      },
    }) {
      const plan = plans.get(request)!;
      plan.push({ subgraphName, query: print(document), variables });
    },
  };
}

export const serveConfig = defineConfig({
  plugins: () => [useExplainQueryPlan()],
});
