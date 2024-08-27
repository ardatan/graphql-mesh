import { createGatewayRuntime as createBaseGatewayRuntime } from '@graphql-mesh/serve-runtime';
import { hiveProductConfig } from './hiveProductConfig.js';

export * from '@graphql-mesh/serve-cli';

export const createGatewayRuntime: typeof createBaseGatewayRuntime = function (config) {
  return createBaseGatewayRuntime({
    ...hiveProductConfig,
    ...config,
  });
};
