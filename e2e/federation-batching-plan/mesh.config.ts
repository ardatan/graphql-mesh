import { print } from 'graphql';
import { defineConfig } from '@graphql-hive/gateway';
import type { GatewayPlugin } from '@graphql-mesh/serve-runtime';

export function useExplainQueryPlan(): GatewayPlugin {
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

export const gatewayConfig = defineConfig({
  plugins: () => [useExplainQueryPlan()],
});
