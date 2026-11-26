import { print, type ExecutionResult } from 'graphql';
import { defineConfig, type GatewayPlugin } from '@graphql-hive/gateway';

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
          const plan = plans.get(request)!;

          // stabilise
          plan.sort((a, b) => a.query.localeCompare(b.query));

          const executionResult = result as ExecutionResult;
          setResult({
            ...executionResult,
            extensions: {
              ...executionResult.extensions,
              plan,
            },
          });
        },
      };
    },
    onSubgraphExecute({ subgraphName, executionRequest: { context, document, variables } }) {
      const plan = plans.get(context!.request)!;
      plan.push({ subgraphName, query: print(document), variables });
    },
  };
}

export const gatewayConfig = defineConfig({
  plugins: () => [useExplainQueryPlan()],
});
