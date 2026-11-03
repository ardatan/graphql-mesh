import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import { useApolloInlineTrace } from '@graphql-yoga/plugin-apollo-inline-trace';

export const gatewayConfig = defineGatewayConfig({
  plugins: () => [useApolloInlineTrace()],
});
