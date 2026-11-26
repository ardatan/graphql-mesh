import { defineConfig } from '@graphql-hive/gateway';

export const gatewayConfig = defineConfig({
  progressiveOverride: label => process.env['OVERRIDE_LABELS']?.includes(label) || false,
});
